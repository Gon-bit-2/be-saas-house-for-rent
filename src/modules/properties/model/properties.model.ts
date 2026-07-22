import z from 'zod'

const PropertyTypeSchema = z.enum(['HOUSE', 'MINI_APARTMENT', 'DORM', 'APARTMENT'])
const PropertyStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE'])

export const ListPropertiesQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().trim().min(1).optional(),
    status: PropertyStatusSchema.optional(),
    type: PropertyTypeSchema.optional(),
    province: z.string().trim().min(1).max(100).optional(),
    district: z.string().trim().min(1).max(100).optional(),
    ward: z.string().trim().min(1).max(100).optional(),
  })
  .strict()

export const CreatePropertyBodySchema = z
  .object({
    name: z.string().trim().min(2).max(255),
    type: PropertyTypeSchema,
    province: z.string().trim().min(1).max(100),
    district: z.string().trim().min(1).max(100),
    ward: z.string().trim().min(1).max(100),
    addressDetail: z.string().trim().min(1).max(2000),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    status: PropertyStatusSchema.default('ACTIVE'),
  })
  .strict()

export const UpdatePropertyBodySchema = CreatePropertyBodySchema.partial()
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
