import { Body, Controller, Get, Ip, Patch, Post, Query, Res } from '@nestjs/common'
import { AuthService } from './auth.service'
import {
  ForgotPasswordBodyDTO,
  GoogleSessionBodyDTO,
  LoginBodyDTO,
  LogoutBodyDTO,
  RefreshTokenBodyDTO,
  RegisterBodyDTO,
  SendOTPBodyDTO,
  UpdateProfileBodyDTO,
  VerifyOTPBodyDTO,
} from './dto/auth.dto'
import { isPublic } from '@src/common/decorators/decorators/auth.decorator'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { UserAgent } from '@src/common/decorators/decorators/user-agent.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import type { Response } from 'express'

/**
 * Controller xử lý các endpoint xác thực người dùng.
 * Bao gồm: đăng ký, đăng nhập 2FA, đăng xuất, refresh token,
 * gửi/xác thực OTP, quên mật khẩu, xem/cập nhật profile.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ==================== PUBLIC ENDPOINTS ====================

  /**
   * Đăng ký tài khoản mới.
   * Yêu cầu OTP REGISTER đã được gửi và xác thực.
   *
   * POST /auth/register
   */
  @isPublic()
  @Post('register')
  register(@Body() body: RegisterBodyDTO) {
    return this.authService.register(body)
  }

  /**
   * Đăng nhập với 2FA OTP.
   * - Lần 1: Gửi email + password → nhận OTP qua email
   * - Lần 2: Gửi email + password + code → nhận token pair
   *
   * POST /auth/login
   */
  @isPublic()
  @Post('login')
  login(@Body() body: LoginBodyDTO, @Ip() ip: string, @UserAgent() userAgent: string) {
    return this.authService.login(body, ip, userAgent)
  }

  /**
   * Gửi mã OTP qua email.
   *
   * POST /auth/send-otp
   */
  @isPublic()
  @Post('send-otp')
  sendOTP(@Body() body: SendOTPBodyDTO) {
    return this.authService.sendOTP(body)
  }

  /**
   * Xác thực mã OTP.
   *
   * POST /auth/verify-otp
   */
  @isPublic()
  @Post('verify-otp')
  verifyOTP(@Body() body: VerifyOTPBodyDTO) {
    return this.authService.verifyOTP(body)
  }

  /**
   * Làm mới token pair bằng refresh token hiện tại.
   *
   * POST /auth/refresh-token
   */
  @isPublic()
  @Post('refresh-token')
  refreshToken(@Body() body: RefreshTokenBodyDTO, @Ip() ip: string, @UserAgent() userAgent: string) {
    return this.authService.refreshToken(body, ip, userAgent)
  }

  /**
   * Đặt lại mật khẩu (quên mật khẩu).
   * Yêu cầu OTP FORGOT_PASSWORD đã được gửi.
   *
   * POST /auth/forgot-password
   */
  @isPublic()
  @Post('forgot-password')
  forgotPassword(@Body() body: ForgotPasswordBodyDTO) {
    return this.authService.forgotPassword(body)
  }

  /**
   * Tạo URL OAuth2 để frontend chuyển người dùng sang Google.
   *
   * GET /auth/google/url
   */
  @isPublic()
  @Get('google/url')
  getGoogleAuthorizationUrl(@Ip() ip: string, @UserAgent() userAgent: string) {
    return this.authService.getGoogleAuthorizationUrl(ip, userAgent)
  }

  /**
   * Callback OAuth2 từ Google. Backend xử lý code và redirect về frontend
   * kèm sessionToken dùng một lần.
   *
   * GET /auth/google/callback
   */
  @isPublic()
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Ip() ip: string,
    @UserAgent() userAgent: string,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.authService.handleGoogleCallback({ code, state, error }, ip, userAgent)
    return res.redirect(redirectUrl)
  }

  /**
   * Đổi sessionToken OAuth2 dùng một lần lấy accessToken + refreshToken.
   *
   * POST /auth/google/session
   */
  @isPublic()
  @Post('google/session')
  googleSession(@Body() body: GoogleSessionBodyDTO, @Ip() ip: string, @UserAgent() userAgent: string) {
    return this.authService.googleSession(body, ip, userAgent)
  }

  // ==================== PROTECTED ENDPOINTS ====================

  /**
   * Đăng xuất: revoke refresh token hiện tại.
   * Yêu cầu Bearer token.
   *
   * POST /auth/logout
   */
  @Post('logout')
  logout(@Body() body: LogoutBodyDTO) {
    return this.authService.logout(body)
  }

  /**
   * Lấy thông tin profile của user hiện tại.
   * Yêu cầu Bearer token.
   *
   * GET /auth/profile
   */
  @Get('profile')
  getProfile(@ActiveUser() user: AccessTokenPayload) {
    return this.authService.getProfile(user.userId)
  }

  /**
   * Cập nhật profile của user hiện tại.
   * Yêu cầu Bearer token.
   *
   * PATCH /auth/profile
   */
  @Patch('profile')
  updateProfile(@ActiveUser() user: AccessTokenPayload, @Body() body: UpdateProfileBodyDTO) {
    return this.authService.updateProfile(user.userId, body)
  }
}
