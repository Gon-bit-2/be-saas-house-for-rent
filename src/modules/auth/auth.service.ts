import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'crypto'
import { OAuth2Client } from 'google-auth-library'
import { TypeOfVerificationCode } from '@src/common/constants/auth.constant'
import envConfig from '@src/config/env.config'
import { AuthRepository } from './repositories/auth.repo'
import { HashingService } from '@src/shared/modules/services/hashing.service'
import { TokenService } from '@src/shared/modules/services/token.service'
import { EmailService } from '@src/shared/modules/services/email.service'
import type {
  TForgotPasswordBodySchema,
  TGoogleAuthStateSchema,
  TGoogleSessionBodySchema,
  TLoginBodySchema,
  TLogoutBodySchema,
  TRefreshTokenBodySchema,
  TRegisterBodySchema,
  TSendOTPBodySchema,
  TUpdateProfileBodySchema,
} from './model/auth.model'

const TIME_UNIT_IN_MS = {
  s: 1_000,
  m: 60_000,
  h: 60 * 60_000,
  d: 24 * 60 * 60_000,
} as const

function parseGoogleOAuthScopes(value: string) {
  return value
    .split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean)
}
function durationToMs(value: string) {
  const normalizedValue = value.trim().toLowerCase()
  const match = normalizedValue.match(/^(\d+)(ms|s|m|h|d)?$/)
  if (!match) {
    throw new Error(`Invalid duration value: ${value}`)
  }

  const amount = Number(match[1])
  const unit = match[2]
  if (!unit || unit === 'ms') {
    return amount
  }

  return amount * TIME_UNIT_IN_MS[unit as keyof typeof TIME_UNIT_IN_MS]
}

type AuthUser = NonNullable<Awaited<ReturnType<AuthRepository['findByEmail']>>>
type GoogleCallbackQuery = {
  code?: string
  state?: string
  error?: string
}

/**
 * Service xử lý toàn bộ logic nghiệp vụ xác thực.
 * Bao gồm: đăng ký, đăng nhập (2FA OTP), OAuth2 Google, đăng xuất,
 * refresh token, gửi/xác thực OTP, quên mật khẩu, xem/cập nhật profile.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  private readonly oauth2Client: OAuth2Client
  private readonly googleSessions = new Map<
    string,
    { userId: number; ip?: string; userAgent?: string; expiresAt: number }
  >()

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly hashingService: HashingService,
    private readonly tokenService: TokenService,
    private readonly emailService: EmailService,
  ) {
    this.oauth2Client = new OAuth2Client({
      clientId: envConfig.GOOGLE_CLIENT_ID,
      clientSecret: envConfig.GOOGLE_CLIENT_SECRET,
      redirectUri: envConfig.GOOGLE_REDIRECT_URI,
      transporterOptions: { timeout: envConfig.GOOGLE_OAUTH_TOKEN_TIMEOUT_MS ?? 5_000 },
    })
    this.oauth2Client.transporter?.interceptors.request.add({
      resolved: (request) =>
        Promise.resolve({
          ...request,
          timeout: envConfig.GOOGLE_OAUTH_TOKEN_TIMEOUT_MS ?? 5_000,
          retry: false,
          retryConfig: undefined,
        }),
    })
  }

  // ==================== REGISTER ====================

  async register(body: TRegisterBodySchema) {
    const email = this.normalizeEmail(body.email)
    await this.verifyAndConsumeOTP(email, body.code, TypeOfVerificationCode.REGISTER)

    const existingUser = await this.authRepository.findByEmail(email)
    if (existingUser) {
      throw new UnprocessableEntityException('Email đã được sử dụng')
    }

    const passwordHash = await this.hashingService.hash(body.passwordHash)
    const user = await this.authRepository.create({
      ...body,
      email,
      passwordHash,
    })

    await this.authRepository.markEmailVerified(user.id)

    return user
  }

  // ==================== LOGIN (2FA OTP) ====================

  async login(body: TLoginBodySchema, ip?: string, userAgent?: string) {
    const email = this.normalizeEmail(body.email)
    const user = await this.authRepository.findByEmailForCredentials(email)
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng')
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa')
    }

    const isPasswordValid = await this.hashingService.compare(body.passwordHash, user.passwordHash)
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng')
    }

    if (body.code) {
      return this.completeLoginWith2FA(user, body.code, ip, userAgent)
    }

    await this.generateAndSendOTP(email, TypeOfVerificationCode.LOGIN)

    return { message: 'OTP đã được gửi đến email của bạn. Vui lòng nhập mã OTP để hoàn tất đăng nhập.' }
  }

  private async completeLoginWith2FA(
    user: NonNullable<Awaited<ReturnType<AuthRepository['findByEmailForCredentials']>>>,
    code: string,
    ip?: string,
    userAgent?: string,
  ) {
    await this.verifyAndConsumeOTP(user.email, code, TypeOfVerificationCode.LOGIN)
    return this.issueTokenPair(user, ip, userAgent)
  }

  // ==================== GOOGLE OAUTH2 ====================

  getGoogleAuthorizationUrl(ip?: string, userAgent?: string) {
    return this.getAuthorizationUrl({
      ip: ip ?? '',
      userAgent: userAgent ?? '',
    })
  }

  getAuthorizationUrl({ userAgent, ip }: TGoogleAuthStateSchema) {
    const url = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      include_granted_scopes: true,
      prompt: 'select_account',
      scope: parseGoogleOAuthScopes(envConfig.GOOGLE_OAUTH_SCOPES),
      state: this.signGoogleState({ ip, userAgent }),
    })

    return { url }
  }

  async handleGoogleCallback(query: GoogleCallbackQuery, ip?: string, userAgent?: string) {
    if (query.error) {
      throw new BadRequestException('Google OAuth đã bị từ chối hoặc thất bại')
    }

    if (!query.code || !query.state) {
      throw new BadRequestException('Thiếu thông tin Google OAuth callback')
    }

    const user = await this.resolveGoogleUser(query.code, query.state, ip, userAgent)
    const sessionToken = this.createGoogleSession(user.id, ip, userAgent)

    return this.buildGoogleClientRedirectUrl(sessionToken)
  }

  async googleCallback({ state, code }: { state: string; code: string }, ip?: string, userAgent?: string) {
    const user = await this.resolveGoogleUser(code, state, ip, userAgent)
    return this.issueTokenPair(user, ip, userAgent)
  }

  async googleSession(body: TGoogleSessionBodySchema, ip?: string, userAgent?: string) {
    const session = this.consumeGoogleSession(body.sessionToken)
    const user = await this.authRepository.findById(session.userId)
    if (!user) {
      throw new UnauthorizedException('Phiên đăng nhập Google không hợp lệ')
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa')
    }

    return this.issueTokenPair(user, ip ?? session.ip, userAgent ?? session.userAgent)
  }

  // ==================== LOGOUT ====================

  async logout(body: TLogoutBodySchema) {
    const tokenHash = this.hashingService.hashSHA256(body.refreshToken)
    await this.authRepository.revokeRefreshTokenByHash(tokenHash, 'User logout')
    return { message: 'Đăng xuất thành công' }
  }

  // ==================== REFRESH TOKEN ====================

  async refreshToken(body: TRefreshTokenBodySchema, ip?: string, userAgent?: string) {
    try {
      const payload = await this.tokenService.verifyRefreshToken(body.refreshToken)
      const user = await this.authRepository.findById(payload.userId)
      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã bị thu hồi')
      }

      const tokenPair = await this.buildTokenPair(user)
      const tokenHash = this.hashingService.hashSHA256(body.refreshToken)
      const successorHash = this.hashingService.hashSHA256(tokenPair.refreshToken)
      const rotated = await this.authRepository.rotateRefreshToken(tokenHash, {
        userId: user.id,
        tokenHash: successorHash,
        expiresAt: new Date(Date.now() + durationToMs(envConfig.REFRESH_TOKEN_EXPIRES_IN)),
        userAgent,
        ip,
      })
      if (!rotated) {
        this.logger.warn(`security_event=refresh_replay user_id=${user.id}`)
        throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã bị thu hồi')
      }
      await this.authRepository.updateLastLoginAt(user.id)
      return tokenPair
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn')
    }
  }

  // ==================== OTP ====================

  async sendOTP(body: TSendOTPBodySchema) {
    await this.generateAndSendOTP(this.normalizeEmail(body.email), body.type)
    return { message: 'Mã OTP đã được gửi đến email của bạn' }
  }

  // ==================== FORGOT PASSWORD ====================

  async forgotPassword(body: TForgotPasswordBodySchema) {
    const email = this.normalizeEmail(body.email)
    await this.verifyAndConsumeOTP(email, body.code, TypeOfVerificationCode.FORGOT_PASSWORD)

    const user = await this.authRepository.findByEmail(email)
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản với email này')
    }

    const newPasswordHash = await this.hashingService.hash(body.newPassword)
    await this.authRepository.updatePassword(user.id, newPasswordHash)
    await this.authRepository.revokeAllRefreshTokensByUser(user.id, 'Password reset')

    return { message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.' }
  }

  // ==================== PROFILE ====================

  async getProfile(userId: number) {
    const user = await this.authRepository.findById(userId)
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng')
    }
    return user
  }

  async updateProfile(userId: number, body: TUpdateProfileBodySchema) {
    const user = await this.authRepository.findById(userId)
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng')
    }
    return this.authRepository.updateProfile(userId, body)
  }

  // ==================== PRIVATE HELPERS ====================

  private async issueTokenPair(user: AuthUser, ip?: string, userAgent?: string) {
    const tokenPair = await this.buildTokenPair(user)
    const refreshTokenHash = this.hashingService.hashSHA256(tokenPair.refreshToken)
    const expiresAt = new Date(Date.now() + durationToMs(envConfig.REFRESH_TOKEN_EXPIRES_IN))
    await this.authRepository.createRefreshToken({
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt,
      userAgent,
      ip,
    })

    await this.authRepository.updateLastLoginAt(user.id)

    return tokenPair
  }

  private async buildTokenPair(user: AuthUser) {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.signAccessToken({
        userId: user.id,
        ver: 2,
      }),
      this.tokenService.signRefreshToken({
        userId: user.id,
      }),
    ])

    return { accessToken, refreshToken }
  }

  private async resolveGoogleUser(code: string, state: string, ip?: string, userAgent?: string) {
    this.verifyGoogleState(state, ip, userAgent)
    const googleUser = await this.getGoogleUserInfoFromCode(code)
    return this.findOrCreateGoogleUser(googleUser)
  }

  private async getGoogleUserInfoFromCode(code: string) {
    let accessToken: string | null | undefined
    try {
      const result = await this.oauth2Client.getToken(code)
      accessToken = result.tokens.access_token
    } catch (error) {
      this.logger.warn('security_event=google_oauth_token_exchange_failed')
      const upstreamStatus = (error as { response?: { status?: number } })?.response?.status
      if (upstreamStatus === 400 || upstreamStatus === 401) {
        throw new BadRequestException('GOOGLE_OAUTH_CODE_INVALID')
      }
      throw new ServiceUnavailableException('GOOGLE_OAUTH_UNAVAILABLE')
    }
    if (!accessToken) {
      throw new ServiceUnavailableException('GOOGLE_OAUTH_UNAVAILABLE')
    }

    const response = await this.fetchGoogleUserInfo(accessToken)

    if (!response.ok) {
      throw new ServiceUnavailableException('GOOGLE_OAUTH_UNAVAILABLE')
    }

    const googleUser = (await response.json()) as {
      email?: string
      email_verified?: boolean
      name?: string
      picture?: string
    }

    if (!googleUser.email || googleUser.email_verified !== true) {
      throw new UnauthorizedException('Email Google chưa được xác thực')
    }

    return {
      email: googleUser.email.toLowerCase(),
      fullName: googleUser.name?.trim() || googleUser.email,
      avatarUrl: googleUser.picture,
    }
  }

  private async fetchGoogleUserInfo(accessToken: string) {
    const maxRetries = envConfig.GOOGLE_USERINFO_MAX_RETRIES ?? 1
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const response = await fetch(envConfig.GOOGLE_USERINFO_URL, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(envConfig.GOOGLE_USERINFO_TIMEOUT_MS ?? 3_000),
        })
        const retryable = response.status === 429 || [502, 503, 504].includes(response.status)
        if (!retryable || attempt === maxRetries) {
          return response
        }
      } catch {
        if (attempt === maxRetries) {
          this.logger.warn('security_event=google_userinfo_timeout_or_network_error')
          throw new ServiceUnavailableException('GOOGLE_OAUTH_UNAVAILABLE')
        }
      }

      this.logger.warn(`security_event=google_userinfo_retry attempt=${attempt + 1}`)
      await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** attempt))
    }

    throw new ServiceUnavailableException('GOOGLE_OAUTH_UNAVAILABLE')
  }

  private async findOrCreateGoogleUser(googleUser: { email: string; fullName: string; avatarUrl?: string }) {
    const existingUser = await this.authRepository.findByEmail(googleUser.email)
    if (existingUser) {
      if (existingUser.status !== 'ACTIVE') {
        throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa')
      }

      if (!existingUser.emailVerifiedAt) {
        return this.authRepository.markEmailVerified(existingUser.id)
      }

      return existingUser
    }

    const passwordHash = await this.hashingService.hash(randomBytes(48).toString('base64url'))
    return this.authRepository.createOAuthTenantUser({
      email: googleUser.email,
      fullName: googleUser.fullName,
      avatarUrl: googleUser.avatarUrl,
      passwordHash,
      emailVerifiedAt: new Date(),
    })
  }

  private signGoogleState(state: TGoogleAuthStateSchema) {
    const payload = {
      ...state,
      nonce: randomUUID(),
      exp: Date.now() + durationToMs(envConfig.GOOGLE_STATE_EXPIRES_IN),
    }
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const signature = this.signStatePayload(encodedPayload)
    return `${encodedPayload}.${signature}`
  }

  private verifyGoogleState(state: string, ip?: string, userAgent?: string) {
    const [encodedPayload, signature] = state.split('.')
    if (!encodedPayload || !signature || !this.isValidSignature(encodedPayload, signature)) {
      throw new BadRequestException('Google OAuth state không hợp lệ')
    }

    let payload: TGoogleAuthStateSchema & { exp?: number }
    try {
      payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as TGoogleAuthStateSchema & {
        exp?: number
      }
    } catch {
      throw new BadRequestException('Google OAuth state không hợp lệ')
    }

    if (!payload.exp || payload.exp < Date.now()) {
      throw new BadRequestException('Google OAuth state đã hết hạn')
    }

    if ((ip ?? '') !== payload.ip || (userAgent ?? '') !== payload.userAgent) {
      throw new BadRequestException('Google OAuth state không khớp thiết bị')
    }
  }

  private signStatePayload(encodedPayload: string) {
    return createHmac('sha256', envConfig.ACCESS_TOKEN_SECRET).update(encodedPayload).digest('base64url')
  }

  private isValidSignature(encodedPayload: string, signature: string) {
    const expectedSignature = this.signStatePayload(encodedPayload)
    const expectedBuffer = Buffer.from(expectedSignature)
    const actualBuffer = Buffer.from(signature)

    return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)
  }

  private createGoogleSession(userId: number, ip?: string, userAgent?: string) {
    this.cleanupExpiredGoogleSessions()

    const sessionToken = randomUUID()
    const sessionTokenHash = this.hashingService.hashSHA256(sessionToken)
    this.googleSessions.set(sessionTokenHash, {
      userId,
      ip,
      userAgent,
      expiresAt: Date.now() + durationToMs(envConfig.GOOGLE_SESSION_EXPIRES_IN),
    })

    return sessionToken
  }

  private consumeGoogleSession(sessionToken: string) {
    this.cleanupExpiredGoogleSessions()

    const sessionTokenHash = this.hashingService.hashSHA256(sessionToken)
    const session = this.googleSessions.get(sessionTokenHash)
    this.googleSessions.delete(sessionTokenHash)

    if (!session || session.expiresAt < Date.now()) {
      throw new UnauthorizedException('Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn')
    }

    return session
  }

  private cleanupExpiredGoogleSessions(now = Date.now()) {
    for (const [sessionTokenHash, session] of this.googleSessions.entries()) {
      if (session.expiresAt < now) {
        this.googleSessions.delete(sessionTokenHash)
      }
    }
  }

  private buildGoogleClientRedirectUrl(sessionToken: string) {
    try {
      const url = new URL(envConfig.GOOGLE_CLIENT_REDIRECT_URI)
      url.searchParams.set('sessionToken', sessionToken)
      return url.toString()
    } catch {
      const separator = envConfig.GOOGLE_CLIENT_REDIRECT_URI.includes('?') ? '&' : '?'
      return `${envConfig.GOOGLE_CLIENT_REDIRECT_URI}${separator}sessionToken=${encodeURIComponent(sessionToken)}`
    }
  }

  private async generateAndSendOTP(email: string, type: string) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const codeHash = await this.hashingService.hash(otp)
    const expiresAt = new Date(Date.now() + durationToMs(envConfig.OTP_EXPIRES_IN))

    await this.authRepository.createVerificationCode({
      email,
      codeHash,
      type: type as 'REGISTER' | 'FORGOT_PASSWORD' | 'LOGIN',
      expiresAt,
    })

    await this.emailService.sendOtpEmail({
      email,
      code: otp,
      title: 'Mã OTP xác thực',
    })

    if (envConfig.NODE_ENV !== 'production') {
      console.log(`[OTP] Email: ${email}, Code: ${otp}, Type: ${type}`)
    }
  }

  private async verifyAndConsumeOTP(email: string, code: string, type: string) {
    const verificationCode = await this.authRepository.findLatestValidVerificationCode(
      email,
      type as 'REGISTER' | 'FORGOT_PASSWORD' | 'LOGIN',
    )
    if (!verificationCode) {
      throw new BadRequestException('Mã OTP không tồn tại hoặc đã hết hạn')
    }

    if (verificationCode.attempts >= envConfig.OTP_MAX_ATTEMPTS) {
      throw new BadRequestException('Bạn đã vượt quá số lần thử cho phép. Vui lòng yêu cầu mã OTP mới.')
    }

    const isCodeValid = await this.hashingService.compare(code, verificationCode.codeHash)
    if (!isCodeValid) {
      await this.authRepository.recordVerificationFailure(
        verificationCode.id,
        email,
        type as 'REGISTER' | 'FORGOT_PASSWORD' | 'LOGIN',
        envConfig.OTP_MAX_ATTEMPTS,
      )
      throw new BadRequestException('Mã OTP không đúng')
    }

    const consumed = await this.authRepository.consumeVerificationCode(
      verificationCode.id,
      email,
      type as 'REGISTER' | 'FORGOT_PASSWORD' | 'LOGIN',
      envConfig.OTP_MAX_ATTEMPTS,
    )
    if (!consumed) {
      this.logger.warn(`security_event=otp_consume_conflict type=${type}`)
      throw new BadRequestException('Mã OTP không tồn tại hoặc đã hết hạn')
    }
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase()
  }
}
