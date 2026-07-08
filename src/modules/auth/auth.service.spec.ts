import { BadRequestException, UnauthorizedException } from '@nestjs/common'

const mockGetToken = jest.fn()
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
      GOOGLE_OAUTH_SCOPES: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
    })

    mockGetToken.mockReset()
    mockGetToken.mockResolvedValue({ tokens: { access_token: 'google-access-token' } })
    mockGenerateAuthUrl.mockClear()

    authRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      markEmailVerified: jest.fn(),
      createOAuthTenantUser: jest.fn(),
      createRefreshToken: jest.fn(),
      updateLastLoginAt: jest.fn(),
    }
    hashingService = {
      hash: jest.fn().mockResolvedValue('hashed-secret'),
      hashSHA256: jest.fn((value: string) => `sha256:${value}`),
    }
    tokenService = {
      signAccessToken: jest.fn().mockResolvedValue('access-token'),
      signRefreshToken: jest.fn().mockResolvedValue('refresh-token'),
    }
    emailService = {
      sendOtpEmail: jest.fn().mockResolvedValue(undefined),
    }
    service = new AuthService(authRepository as never, hashingService as never, tokenService as never, emailService as never)
    fetchMock = jest.spyOn(global, 'fetch')
  })

  afterEach(() => {
    fetchMock.mockRestore()
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

  it('rejects callback when Google returns an OAuth error', async () => {
    await expect(service.handleGoogleCallback({ error: 'access_denied' }, '127.0.0.1', 'jest-agent')).rejects.toBeInstanceOf(
      BadRequestException,
    )
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
    expect(tokenService.signAccessToken).toHaveBeenCalledWith({ userId: 1, roleId: 'TENANT', roleName: 'TENANT' })
    expect(authRepository.createRefreshToken).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, tokenHash: 'sha256:refresh-token' }),
    )
    await expect(service.googleSession({ sessionToken }, '127.0.0.1', 'jest-agent')).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
  })

  it('creates a default TENANT user when Google email does not exist', async () => {
    const createdUser = makeUser({ email: 'new@example.com', fullName: 'New User', avatarUrl: 'https://avatar.test/a.png' })
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

    await expect(service.handleGoogleCallback({ code: 'google-code', state }, '127.0.0.1', 'jest-agent')).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
  })
})



