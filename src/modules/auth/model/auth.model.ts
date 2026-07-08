import { TypeOfVerificationCode, UserStatus } from '@src/common/constants/auth.constant'
import { IsoDateTimeCodec } from '@src/common/utils/date-codec.util'
import z from 'zod'

export const UserSchema = z.object({
  id: z.number().int(),
  fullName: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  passwordHash: z
    .string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
    .max(100, 'Mật khẩu không được vượt quá 100 ký tự')
    .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất một chữ cái in hoa')
    .regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất một chữ cái in thường')
    .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất một chữ số')
    .regex(/[^A-Za-z0-9]/, 'Mật khẩu phải chứa ít nhất một ký tự đặc biệt'),
  avatarUrl: z.string().optional(),
  status: z.enum(UserStatus),
  totpSecret: z.string().optional(),
  emailVerifiedAt: z.string().optional(),
  phoneVerifiedAt: z.string().optional(),
  lastLoginAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().optional(),
})
export const RegisterBodySchema = UserSchema.pick({
  email: true,
  passwordHash: true,
  fullName: true,
  phone: true,
})
  .extend({
    confirmPassword: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .max(100, 'Mật khẩu không được vượt quá 100 ký tự')
      .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất một chữ cái in hoa')
      .regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất một chữ cái in thường')
      .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất một chữ số')
      .regex(/[^A-Za-z0-9]/, 'Mật khẩu phải chứa ít nhất một ký tự đặc biệt'),
    code: z.string().length(6),
    roleCode: z.enum(['LANDLORD', 'TENANT']).refine((roleCode) => roleCode === 'LANDLORD' || roleCode === 'TENANT', {
      message: 'Vai trò đăng ký không hợp lệ! Chỉ hỗ trợ Chủ trọ hoặc Khách thuê.',
    }),
  })
  .strict()
  .superRefine(({ confirmPassword, passwordHash }, ctx) => {
    if (confirmPassword !== passwordHash) {
      ctx.addIssue({
        code: 'custom',
        message: 'Password anh Confirm Password must match',
        path: ['confirmPassword'],
      })
    }
  })
export const RegisterResSchema = UserSchema.omit({
  passwordHash: true,
  totpSecret: true,
})
//
export const VerificationCodeSchema = z.object({
  id: z.number().int(),
  email: z.string().email(),
  codeHash: z.string(),
  type: z.enum([TypeOfVerificationCode.REGISTER, TypeOfVerificationCode.FORGOT_PASSWORD, TypeOfVerificationCode.LOGIN]),
  attempts: z.number().int().nonnegative(),
  expiresAt: IsoDateTimeCodec,
  consumedAt: IsoDateTimeCodec.optional(),
  invalidatedAt: IsoDateTimeCodec.optional(),
  createdAt: IsoDateTimeCodec,
})
export const SendOTPBodySchema = VerificationCodeSchema.pick({
  email: true,
  type: true,
}).strict()
export const VerifyOTPBodySchema = VerificationCodeSchema.pick({
  email: true,
  type: true,
})
  .extend({
    code: z.string().length(6),
  })
  .strict()
// login
export const LoginBodySchema = UserSchema.pick({
  email: true,
  passwordHash: true,
})
  .extend({
    code: z.string().length(6).optional(), //otp code email
  })
  .strict()
export const LoginResSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
})
//refresh token
export const RefreshTokenSchema = z.object({
  id: z.number().int(),
  userId: z.number().int(),
  tokenHash: z.string(),
  userAgent: z.string().optional(),
  ip: z.string().optional(),
  expiresAt: IsoDateTimeCodec,
  revokedAt: IsoDateTimeCodec.optional(),
  revokedReason: z.string().optional(),
  createdAt: IsoDateTimeCodec,
  updatedAt: IsoDateTimeCodec,
})
export const RefreshTokenBodySchema = z
  .object({
    refreshToken: z.string(),
  })
  .strict()
export const RefreshTokenResSchema = LoginResSchema
//Device
export const DeviceSchema = z.object({
  id: z.number().int(),
  userId: z.number().int(),
  userAgent: z.string(),
  ip: z.string(),
  lastActiveAt: IsoDateTimeCodec,
  createdAt: IsoDateTimeCodec,
  isActive: z.boolean().optional(),
})
// export const GetUsserProfileResSchema = UserSchema.omit({
//   passwordHash: true,
//   totpSecret: true,
// }).extend({
//   isTwoFactorEnabled: z.boolean(),
//   role: RoleSchema.pick({
//     id: true,
//     name: true,
//   }).extend({
//     permissions: z.array(
//       PermissionSchema.pick({
//         id: true,
//         name: true,
//         module: true,
//         path: true,
//         method: true,
//       }),
//     ),
//   }),
// })
//logout
export const LogoutBodySchema = RefreshTokenBodySchema
//oauth2
export const GoogleAuthStateSchema = DeviceSchema.pick({
  userAgent: true,
  ip: true,
})
export const GetAuthorizationUrlResSchema = z.object({
  url: z.string().url(),
})
export const GoogleSessionBodySchema = z
  .object({
    sessionToken: z.string().uuid(),
  })
  .strict()
export const GoogleSessionResSchema = LoginResSchema
//forgot password
export const ForgotPasswordBodySchema = z
  .object({
    email: z.string().email(),
    code: z.string().length(6),
    newPassword: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .max(100, 'Mật khẩu không được vượt quá 100 ký tự')
      .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất một chữ cái in hoa')
      .regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất một chữ cái in thường')
      .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất một chữ số')
      .regex(/[^A-Za-z0-9]/, 'Mật khẩu phải chứa ít nhất một ký tự đặc biệt'),
    confirmNewPassword: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .max(100, 'Mật khẩu không được vượt quá 100 ký tự')
      .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất một chữ cái in hoa')
      .regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất một chữ cái in thường')
      .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất một chữ số')
      .regex(/[^A-Za-z0-9]/, 'Mật khẩu phải chứa ít nhất một ký tự đặc biệt'),
  })
  .strict()
  .superRefine(({ confirmNewPassword, newPassword }, ctx) => {
    if (confirmNewPassword !== newPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'Mật khẩu không khớp',
        path: ['confirmNewPassword'],
      })
    }
  })
export const UpdateProfileBodySchema = UserSchema.pick({
  fullName: true,
  phone: true,
  avatarUrl: true,
})
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Vui lòng cung cấp ít nhất một trường để cập nhật',
  })
export const UpdateProfileResSchema = RegisterResSchema

//type
export type UserType = z.infer<typeof UserSchema>
export type TRegisterBodySchema = z.infer<typeof RegisterBodySchema>
export type TRegisterResSchema = z.infer<typeof RegisterResSchema>
export type TVerificationCodeSchema = z.infer<typeof VerificationCodeSchema>
export type TSendOTPBodySchema = z.infer<typeof SendOTPBodySchema>
export type TVerifyOTPBodySchema = z.infer<typeof VerifyOTPBodySchema>
export type TLoginBodySchema = z.infer<typeof LoginBodySchema>
export type TLoginResSchema = z.infer<typeof LoginResSchema>
export type TRefreshTokenSchema = z.infer<typeof RefreshTokenSchema>
export type TRefreshTokenBodySchema = z.infer<typeof RefreshTokenBodySchema>
export type TRefreshTokenResSchema = z.infer<typeof RefreshTokenResSchema>
// export type TGetUsserProfileResSchema = z.infer<typeof GetUsserProfileResSchema>
export type TLogoutBodySchema = z.infer<typeof LogoutBodySchema>
export type TGoogleAuthStateSchema = z.infer<typeof GoogleAuthStateSchema>
export type TGetAuthorizationUrlResSchema = z.infer<typeof GetAuthorizationUrlResSchema>
export type TGoogleSessionBodySchema = z.infer<typeof GoogleSessionBodySchema>
export type TGoogleSessionResSchema = z.infer<typeof GoogleSessionResSchema>
export type TForgotPasswordBodySchema = z.infer<typeof ForgotPasswordBodySchema>
export type TUpdateProfileBodySchema = z.infer<typeof UpdateProfileBodySchema>
export type TUpdateProfileResSchema = z.infer<typeof UpdateProfileResSchema>
