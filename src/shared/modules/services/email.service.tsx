import React from 'react'
import { BadGatewayException, Injectable } from '@nestjs/common'
import { OTPVerificationEmail } from '@src/shared/mail/otp'
import { Resend } from 'resend'
import envConfig from '@src/config/env.config'

type SendOtpEmailPayload = {
  email: string
  code: string
  title?: string
}

/**
 * Service that handles sending emails using the Resend API provider.
 * Service xử lý gửi email sử dụng nhà cung cấp API Resend.
 *
 * Integrates React-based email templates (like OTPVerificationEmail) to send interactive
 * and visually rich emails to users.
 * Tích hợp các template email dựa trên React (như OTPVerificationEmail) để gửi các email
 * sinh động và giàu tương tác cho người dùng.
 */
@Injectable()
export class EmailService {
  private readonly resend: Resend

  constructor() {
    this.resend = new Resend(envConfig.RESEND_API_KEY)
  }

  /**
   * Sends an OTP verification email to a specific user email address.
   * Gửi một email xác thực mã OTP tới một địa chỉ email người dùng cụ thể.
   */
  async sendOtpEmail(payload: SendOtpEmailPayload): Promise<void> {
    const subject = payload.title ?? 'Mã OTP xác thực'
    const result = await this.resend.emails.send({
      from: 'thiendev <no-reply@gonshoe.online>',
      to: [payload.email],
      subject,
      react: <OTPVerificationEmail otpCode={payload.code} title={subject} />,
    })

    if (result.error) {
      throw new BadGatewayException('Không thể gửi email OTP')
    }
  }
}
