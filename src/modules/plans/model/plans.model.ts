import z from 'zod'

const booleanQueryValue = z.union([z.boolean(), z.enum(['true', 'false'])]).transform((value) => {
  if (typeof value === 'boolean') {
    return value
  }
  return value === 'true'
})

export const ListPlansQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().trim().optional(),
    isActive: booleanQueryValue.optional(),
  })
  .strict()

export const CreatePlanBodySchema = z
  .object({
    code: z.string().trim().min(2).max(50),
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(2000).optional(),
    priceMonthly: z.coerce.number().nonnegative(),
    priceYearly: z.coerce.number().nonnegative(),
    maxProperties: z.coerce.number().int().nonnegative().optional(),
    maxRooms: z.coerce.number().int().positive(),
    maxStaff: z.coerce.number().int().positive(),
    maxStorageGb: z.coerce.number().int().nonnegative().optional(),
    allowAiOcr: z.boolean().default(false),
    allowWebhookPayment: z.boolean().default(false),
    isActive: z.boolean().default(true),
  })
  .strict()

export const UpdatePlanBodySchema = CreatePlanBodySchema.omit({ code: true })
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Vui lòng cung cấp ít nhất một trường để cập nhật gói dịch vụ',
  })

export type TListPlansQuerySchema = z.infer<typeof ListPlansQuerySchema>
export type TCreatePlanBodySchema = z.infer<typeof CreatePlanBodySchema>
export type TUpdatePlanBodySchema = z.infer<typeof UpdatePlanBodySchema>
