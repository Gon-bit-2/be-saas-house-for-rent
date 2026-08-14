import z from 'zod'

const PropertyTypeSchema = z.enum(['HOUSE', 'MINI_APARTMENT', 'DORM', 'APARTMENT'])
const PropertyStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE'])

export const PropertyLocationSchema = z
  .object({
    provinceCode: z.string().regex(/^\d{2}$/),
    wardCode: z.string().regex(/^\d{5}$/),
    placeId: z.string().trim().min(1).max(500),
    sessionToken: z.string().trim().min(8).max(200).optional(),
  })
  .strict()

export const ListPropertiesQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().trim().optional(),
    status: PropertyStatusSchema.optional(),
    type: PropertyTypeSchema.optional(),
    province: z.string().trim().min(1).max(100).optional(),
    district: z.string().trim().min(1).max(100).optional(),
    ward: z.string().trim().min(1).max(100).optional(),
    provinceCode: z.string().regex(/^\d{2}$/).optional(),
    wardCode: z.string().regex(/^\d{5}$/).optional(),
  })
  .strict()

const PropertyBodyFieldsSchema = z
  .object({
    name: z.string().trim().min(2).max(255),
    type: PropertyTypeSchema,
    province: z.string().trim().min(1).max(100).optional(),
    district: z.string().trim().min(1).max(100).nullable().optional(),
    ward: z.string().trim().min(1).max(100).optional(),
    addressDetail: z.string().trim().min(1).max(2000),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    status: PropertyStatusSchema.default('ACTIVE'),
    floorsCount: z.coerce.number().int().min(1).max(50).optional(),
    location: PropertyLocationSchema.optional(),
  })
  .strict()

export const CreatePropertyBodySchema = PropertyBodyFieldsSchema
  .superRefine((data, ctx) => {
    if (data.location) return
    for (const field of ['province', 'district', 'ward'] as const) {
      if (!data[field]) ctx.addIssue({ code: 'custom', path: [field], message: `${field} là bắt buộc với địa chỉ cũ` })
    }
  })

export const UpdatePropertyBodySchema = PropertyBodyFieldsSchema.partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Vui lòng cung cấp ít nhất một trường để cập nhật nhà trọ',
  })

export const UpdatePropertyStatusBodySchema = z.object({ status: PropertyStatusSchema }).strict()

export const CreateFloorBodySchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    floorNumber: z.coerce.number().int().min(-10).max(200),
  })
  .strict()

export const UpdateFloorBodySchema = CreateFloorBodySchema.partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Vui lòng cung cấp ít nhất một trường để cập nhật tầng',
  })

export type TListPropertiesQuerySchema = z.infer<typeof ListPropertiesQuerySchema>
export type TCreatePropertyBodySchema = z.infer<typeof CreatePropertyBodySchema>
export type TUpdatePropertyBodySchema = z.infer<typeof UpdatePropertyBodySchema>
export type TUpdatePropertyStatusBodySchema = z.infer<typeof UpdatePropertyStatusBodySchema>
export type TCreateFloorBodySchema = z.infer<typeof CreateFloorBodySchema>
export type TUpdateFloorBodySchema = z.infer<typeof UpdateFloorBodySchema>
