import z from 'zod'
import { IsoDateInputCodec } from '@src/common/utils/date-codec.util'

const GenderSchema = z.enum(['MALE', 'FEMALE', 'OTHER'])

export const ListRentersQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().trim().optional(),
    verificationStatus: z.enum(['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED']).optional(),
  })
  .strict()

export const ListRentalHistoryQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: z.enum(['ACTIVE', 'ENDED', 'TERMINATED']).optional(),
  })
  .strict()

export const UpdateRenterProfileBodySchema = z
  .object({
    dateOfBirth: IsoDateInputCodec.nullable().optional(),
    gender: GenderSchema.nullable().optional(),
    identityNumber: z.string().trim().max(50).nullable().optional(),
    identityFrontUrl: z.string().trim().url().max(2000).nullable().optional(),
    identityBackUrl: z.string().trim().url().max(2000).nullable().optional(),
    permanentAddress: z.string().trim().max(2000).nullable().optional(),
    occupation: z.string().trim().max(100).nullable().optional(),
    emergencyContactName: z.string().trim().max(100).nullable().optional(),
    emergencyContactPhone: z.string().trim().max(50).nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Vui lòng cung cấp ít nhất một trường để cập nhật hồ sơ người thuê',
  })

export const InviteRenterBodySchema = z
  .object({
    fullName: z.string().trim().min(2).max(255),
    email: z.string().trim().email().max(255),
    phone: z.string().trim().min(8).max(50).optional(),
  })
  .strict()

const InvitationPasswordSchema = z
  .string()
  .min(8)
  .max(100)
  .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất một chữ cái in hoa')
  .regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất một chữ cái in thường')
  .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất một chữ số')
  .regex(/[^A-Za-z0-9]/, 'Mật khẩu phải chứa ít nhất một ký tự đặc biệt')

export const AcceptRenterInvitationBodySchema = z
  .object({
    email: z.string().trim().email().max(255),
    code: z.string().trim().length(6),
    password: InvitationPasswordSchema,
    confirmPassword: InvitationPasswordSchema,
  })
  .strict()
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (password !== confirmPassword) {
      ctx.addIssue({ code: 'custom', message: 'Mật khẩu xác nhận không khớp', path: ['confirmPassword'] })
    }
  })

export const UpdateRenterForLandlordBodySchema = z
  .object({
    fullName: z.string().trim().min(2).max(255).optional(),
    phone: z.string().trim().min(8).max(50).nullable().optional(),
    dateOfBirth: IsoDateInputCodec.nullable().optional(),
    gender: GenderSchema.nullable().optional(),
    identityNumber: z.string().trim().max(50).nullable().optional(),
    identityFrontUrl: z.string().trim().url().max(2000).nullable().optional(),
    identityBackUrl: z.string().trim().url().max(2000).nullable().optional(),
    permanentAddress: z.string().trim().max(2000).nullable().optional(),
    occupation: z.string().trim().max(100).nullable().optional(),
    emergencyContactName: z.string().trim().max(100).nullable().optional(),
    emergencyContactPhone: z.string().trim().max(50).nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Vui lòng cung cấp ít nhất một trường để cập nhật người thuê',
  })
export type TListRentersQuerySchema = z.infer<typeof ListRentersQuerySchema>
export type TListRentalHistoryQuerySchema = z.infer<typeof ListRentalHistoryQuerySchema>
export type TUpdateRenterProfileBodySchema = z.infer<typeof UpdateRenterProfileBodySchema>
export type TInviteRenterBodySchema = z.infer<typeof InviteRenterBodySchema>
export type TAcceptRenterInvitationBodySchema = z.infer<typeof AcceptRenterInvitationBodySchema>
export type TUpdateRenterForLandlordBodySchema = z.infer<typeof UpdateRenterForLandlordBodySchema>
