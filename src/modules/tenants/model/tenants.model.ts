import z from 'zod'

const BillingCycleSchema = z.enum(['MONTHLY', 'YEARLY'])
const TenantStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'CLOSED'])
const VerificationStatusSchema = z.enum(['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'])

const strongPasswordSchema = z
  .string()
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .max(100, 'Mật khẩu không được vượt quá 100 ký tự')
  .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất một chữ cái in hoa')
  .regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất một chữ cái in thường')
  .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất một chữ số')
  .regex(/[^A-Za-z0-9]/, 'Mật khẩu phải chứa ít nhất một ký tự đặc biệt')

export const ListTenantsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().trim().min(1).optional(),
    status: TenantStatusSchema.optional(),
    verificationStatus: VerificationStatusSchema.optional(),
    planId: z.coerce.number().int().positive().optional(),
  })
  .strict()

export const CreateTenantBodySchema = z
  .object({
    fullName: z.string().trim().min(2).max(255),
    email: z.string().trim().email().max(255),
    phone: z.string().trim().min(6).max(50).optional(),
    password: strongPasswordSchema,
    tenantName: z.string().trim().min(2).max(255),
    taxCode: z.string().trim().max(50).optional(),
    tenantPhone: z.string().trim().min(6).max(50).optional(),
    tenantEmail: z.string().trim().email().max(255).optional(),
    address: z.string().trim().max(2000).optional(),
    planId: z.coerce.number().int().positive(),
    billingCycle: BillingCycleSchema.default('MONTHLY'),
    autoRenew: z.boolean().default(true),
  })
  .strict()

export const UpdateTenantBodySchema = z
  .object({
    name: z.string().trim().min(2).max(255).optional(),
    taxCode: z.string().trim().max(50).nullable().optional(),
    phone: z.string().trim().min(6).max(50).nullable().optional(),
    email: z.string().trim().email().max(255).nullable().optional(),
    address: z.string().trim().max(2000).nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Vui lòng cung cấp ít nhất một trường để cập nhật tenant',
  })

export const UpdateTenantStatusBodySchema = z.object({ status: TenantStatusSchema }).strict()
export const UpdateTenantVerificationBodySchema = z.object({ verificationStatus: VerificationStatusSchema }).strict()
export const AssignTenantPlanBodySchema = z
  .object({
    planId: z.coerce.number().int().positive(),
    billingCycle: BillingCycleSchema.default('MONTHLY'),
    autoRenew: z.boolean().default(true),
  })
  .strict()

export type TListTenantsQuerySchema = z.infer<typeof ListTenantsQuerySchema>
export type TCreateTenantBodySchema = z.infer<typeof CreateTenantBodySchema>
export type TUpdateTenantBodySchema = z.infer<typeof UpdateTenantBodySchema>
export type TUpdateTenantStatusBodySchema = z.infer<typeof UpdateTenantStatusBodySchema>
export type TUpdateTenantVerificationBodySchema = z.infer<typeof UpdateTenantVerificationBodySchema>
export type TAssignTenantPlanBodySchema = z.infer<typeof AssignTenantPlanBodySchema>
