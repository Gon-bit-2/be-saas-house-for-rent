import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common'

const mockGetToken = jest.fn()
const mockAddRequestInterceptor = jest.fn()
type RequestInterceptor = {
  resolved: (request: { timeout: number; retry: boolean; retryConfig?: unknown }) => Promise<{
    timeout: number
    retry: boolean
    retryConfig?: unknown
  }>
}
const mockGenerateAuthUrl = jest.fn((options: { state?: string; scope?: string[] }) => {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', 'google-client-id')
  url.searchParams.set('redirect_uri', 'http://localhost:3000/auth/google/callback')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', options.scope?.join(' ') ?? '')
  url.searchParams.set('state', options.state ?? '')
  return url.toString()
})

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    generateAuthUrl: mockGenerateAuthUrl,
    getToken: mockGetToken,
    transporter: { interceptors: { request: { add: mockAddRequestInterceptor } } },
  })),
}))
jest.mock('./repositories/auth.repo', () => ({ AuthRepository: class AuthRepository {} }))
jest.mock('@src/shared/modules/services/token.service', () => ({ TokenService: class TokenService {} }))
jest.mock('@src/shared/modules/services/email.service', () => ({ EmailService: class EmailService {} }))

process.env.MAIL_FROM = process.env.MAIL_FROM ?? 'Test <test@example.com>'

const envConfig = require('@src/config/env.config').default as typeof import('@src/config/env.config').default
const { AuthService } = require('./auth.service') as typeof import('./auth.service')

const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  email: 'user@example.com',
  fullName: 'User Example',
  phone: null,
  systemRole: null,
  avatarUrl: null,
  status: 'ACTIVE',
  emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
  phoneVerifiedAt: null,
  lastLoginAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedAt: null,
  tenantMembers: [],
  renterProfile: {
    id: 10,
    verificationStatus: 'PENDING',
  },
  ...overrides,
})

describe('AuthService Google OAuth2', () => {
  let service: import('./auth.service').AuthService
  let authRepository: Record<string, jest.Mock>
  let hashingService: Record<string, jest.Mock>
  let tokenService: Record<string, jest.Mock>
  let emailService: Record<string, jest.Mock>
  let fetchMock: jest.SpiedFunction<typeof fetch>

  beforeEach(() => {
    Object.assign(envConfig, {
      ACCESS_TOKEN_SECRET: 'test-access-secret',
      GOOGLE_CLIENT_ID: 'google-client-id',
      GOOGLE_CLIENT_SECRET: 'google-client-secret',
      GOOGLE_REDIRECT_URI: 'http://localhost:3000/auth/google/callback',
      GOOGLE_CLIENT_REDIRECT_URI: 'http://localhost:5173/oauth/google',
      GOOGLE_OAUTH_SCOPES:
        'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
      GOOGLE_OAUTH_TOKEN_TIMEOUT_MS: 5_000,
      GOOGLE_USERINFO_TIMEOUT_MS: 3_000,
      GOOGLE_USERINFO_MAX_RETRIES: 1,
    })

    mockGetToken.mockReset()
    mockGetToken.mockResolvedValue({ tokens: { access_token: 'google-access-token' } })
    mockGenerateAuthUrl.mockClear()

    authRepository = {
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      findByEmailForCredentials: jest.fn(),
      findById: jest.fn(),
      markEmailVerified: jest.fn(),
      create: jest.fn(),
      createOAuthTenantUser: jest.fn(),
      createRefreshToken: jest.fn(),
      rotateRefreshToken: jest.fn(),
      findLatestValidVerificationCode: jest.fn(),
      consumeVerificationCode: jest.fn(),
      recordVerificationFailure: jest.fn(),
      updateProfile: jest.fn(),
      updateLastLoginAt: jest.fn(),
    }
    hashingService = {
      hash: jest.fn().mockResolvedValue('hashed-secret'),
      hashSHA256: jest.fn((value: string) => `sha256:${value}`),
      compare: jest.fn(),
    }
    tokenService = {
      signAccessToken: jest.fn().mockResolvedValue('access-token'),
      signRefreshToken: jest.fn().mockResolvedValue('refresh-token'),
      verifyRefreshToken: jest.fn(),
    }
    emailService = {
      sendOtpEmail: jest.fn().mockResolvedValue(undefined),
    }
    service = new AuthService(
      authRepository as never,
      hashingService as never,
      tokenService as never,
      emailService as never,
    )
    fetchMock = jest.spyOn(global, 'fetch')
  })

  afterEach(() => {
    fetchMock.mockRestore()
  })

  it('rejects a duplicate registration phone before consuming the OTP', async () => {
    authRepository.findByEmail.mockResolvedValue(null)
    authRepository.findByPhone.mockResolvedValue(makeUser({ phone: '0900000000' }))

    const error = await service
      .register({
        email: 'NEW@example.com',
        fullName: 'New User',
        phone: '0900000000',
        password: 'Password1!',
        confirmPassword: 'Password1!',
        code: '123456',
        roleCode: 'TENANT',
      })
      .catch((reason) => reason)

    expect(error).toBeInstanceOf(ConflictException)
    expect(error.message).toBe('Số điện thoại này đã được sử dụng')
    expect(authRepository.findLatestValidVerificationCode).not.toHaveBeenCalled()
    expect(authRepository.create).not.toHaveBeenCalled()
  })

  it('returns a conflict when registration loses a unique-constraint race', async () => {
    authRepository.findByEmail.mockResolvedValue(null)
    authRepository.findByPhone.mockResolvedValue(null)
    authRepository.findLatestValidVerificationCode.mockResolvedValue({
      id: 7,
      email: 'new@example.com',
      type: 'REGISTER',
      codeHash: 'otp-hash',
      attempts: 0,
    })
    hashingService.compare.mockResolvedValue(true)
    authRepository.consumeVerificationCode.mockResolvedValue(true)
    authRepository.create.mockRejectedValue({ code: 'P2002' })

    const error = await service
      .register({
        email: 'NEW@example.com',
        fullName: 'New User',
        phone: '0900000000',
        password: 'Password1!',
        confirmPassword: 'Password1!',
        code: '123456',
        roleCode: 'TENANT',
      })
      .catch((reason) => reason)

    expect(error).toBeInstanceOf(ConflictException)
    expect(error.message).toBe('Email hoặc số điện thoại đã được sử dụng')
  })

  it('creates a Google authorization URL with expected OAuth params and signed state', () => {
    const result = service.getGoogleAuthorizationUrl('127.0.0.1', 'jest-agent')
    const url = new URL(result.url)

    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url.searchParams.get('client_id')).toBe('google-client-id')
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000/auth/google/callback')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('scope')).toBe(
      'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
    )
    expect(url.searchParams.get('state')).toMatch(/^[^.]+\.[^.]+$/)
  })

  it('forces a bounded token exchange with POST retries disabled', async () => {
    const interceptor = mockAddRequestInterceptor.mock.calls.at(-1)?.[0] as RequestInterceptor
    const request = await interceptor.resolved({ timeout: 0, retry: true, retryConfig: { retry: 3 } })

    expect(request.timeout).toBe(5_000)
    expect(request.retry).toBe(false)
    expect(request.retryConfig).toBeUndefined()
  })

  it('retries transient Google userinfo failure once', async () => {
    const user = makeUser()
    const state = new URL(service.getGoogleAuthorizationUrl('127.0.0.1', 'jest-agent').url).searchParams.get('state')!
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 } as Response).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ email: 'user@example.com', email_verified: true, name: 'User' }),
    } as Response)
    authRepository.findByEmail.mockResolvedValue(user)

    await service.handleGoogleCallback({ code: 'google-code', state }, '127.0.0.1', 'jest-agent')

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('rejects callback when Google returns an OAuth error', async () => {
    await expect(
      service.handleGoogleCallback({ error: 'access_denied' }, '127.0.0.1', 'jest-agent'),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('logs in an existing active Google user through one-time session exchange', async () => {
    const user = makeUser()
    const state = new URL(service.getGoogleAuthorizationUrl('127.0.0.1', 'jest-agent').url).searchParams.get('state')!
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ email: 'USER@example.com', email_verified: true, name: 'User Example' }),
    } as Response)
    authRepository.findByEmail.mockResolvedValue(user)
    authRepository.findById.mockResolvedValue(user)

    const redirectUrl = await service.handleGoogleCallback({ code: 'google-code', state }, '127.0.0.1', 'jest-agent')
    const sessionToken = new URL(redirectUrl).searchParams.get('sessionToken')!
    const tokens = await service.googleSession({ sessionToken }, '127.0.0.1', 'jest-agent')

    expect(tokens).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' })
    expect(tokenService.signAccessToken).toHaveBeenCalledWith({ userId: 1, ver: 2 })
    expect(authRepository.createRefreshToken).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, tokenHash: 'sha256:refresh-token' }),
    )
    await expect(service.googleSession({ sessionToken }, '127.0.0.1', 'jest-agent')).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
  })

  it('creates a default TENANT user when Google email does not exist', async () => {
    const createdUser = makeUser({
      email: 'new@example.com',
      fullName: 'New User',
      avatarUrl: 'https://avatar.test/a.png',
    })
    const state = new URL(service.getGoogleAuthorizationUrl('127.0.0.1', 'jest-agent').url).searchParams.get('state')!
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        email: 'NEW@example.com',
        email_verified: true,
        name: 'New User',
        picture: 'https://avatar.test/a.png',
      }),
    } as Response)
    authRepository.findByEmail.mockResolvedValue(null)
    authRepository.createOAuthTenantUser.mockResolvedValue(createdUser)

    await service.handleGoogleCallback({ code: 'google-code', state }, '127.0.0.1', 'jest-agent')

    expect(authRepository.createOAuthTenantUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new@example.com',
        fullName: 'New User',
        avatarUrl: 'https://avatar.test/a.png',
        passwordHash: 'hashed-secret',
        emailVerifiedAt: expect.any(Date),
      }),
    )
  })

  it('rejects Google userinfo when email is not verified', async () => {
    const state = new URL(service.getGoogleAuthorizationUrl('127.0.0.1', 'jest-agent').url).searchParams.get('state')!
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ email: 'user@example.com', email_verified: false }),
    } as Response)

    await expect(
      service.handleGoogleCallback({ code: 'google-code', state }, '127.0.0.1', 'jest-agent'),
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('only consumes login OTP inside the final login action', async () => {
    const user = makeUser({ passwordHash: 'stored-hash' })
    authRepository.findByEmailForCredentials.mockResolvedValue(user)
    authRepository.findLatestValidVerificationCode.mockResolvedValue({
      id: 7,
      email: 'user@example.com',
      type: 'LOGIN',
      codeHash: 'otp-hash',
      attempts: 0,
    })
    hashingService.compare.mockResolvedValue(true)
    authRepository.consumeVerificationCode.mockResolvedValue(false)

    await expect(
      service.login({ email: 'USER@example.com', passwordHash: 'Password1!', code: '123456' }),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(authRepository.consumeVerificationCode).toHaveBeenCalledWith(
      7,
      'user@example.com',
      'LOGIN',
      envConfig.OTP_MAX_ATTEMPTS,
    )
  })

  it('does not persist a second successor when refresh-token CAS loses', async () => {
    const user = makeUser()
    tokenService.verifyRefreshToken.mockResolvedValue({ userId: 1 })
    authRepository.findById.mockResolvedValue(user)
    authRepository.rotateRefreshToken.mockResolvedValue(false)

    await expect(service.refreshToken({ refreshToken: 'old-refresh' }, '127.0.0.1', 'agent')).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
    expect(authRepository.rotateRefreshToken).toHaveBeenCalledWith(
      'sha256:old-refresh',
      expect.objectContaining({ userId: 1, tokenHash: 'sha256:refresh-token' }),
    )
  })

  it('returns a conflict when profile phone violates its unique constraint without target metadata', async () => {
    authRepository.findById.mockResolvedValue(makeUser())
    authRepository.updateProfile.mockRejectedValue({ code: 'P2002', meta: { modelName: 'User' } })

    const error = await service.updateProfile(1, { phone: '0900000000' }).catch((reason) => reason)

    expect(error).toBeInstanceOf(ConflictException)
    expect(error.message).toBe('Số điện thoại này đã được sử dụng')
  })

  it('does not hide non-unique profile update errors', async () => {
    const databaseError = { code: 'P2025' }
    authRepository.findById.mockResolvedValue(makeUser())
    authRepository.updateProfile.mockRejectedValue(databaseError)

    await expect(service.updateProfile(1, { fullName: 'Updated User' })).rejects.toBe(databaseError)
  })
})
