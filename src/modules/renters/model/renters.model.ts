import z from 'zod'

const GenderSchema = z.enum(['MALE', 'FEMALE', 'OTHER'])

export const ListRentersQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().trim().min(1).optional(),
    verificationStatus: z.enum(['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED']).optional(),
  })
  .strict()

export const UpdateRenterProfileBodySchema = z
  .object({
    dateOfBirth: z.coerce.date().nullable().optional(),
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

export type TListRentersQuerySchema = z.infer<typeof ListRentersQuerySchema>
export type TUpdateRenterProfileBodySchema = z.infer<typeof UpdateRenterProfileBodySchema>
