import z from 'zod'

const booleanQueryValue = z.union([z.boolean(), z.enum(['true', 'false'])]).transform((value) => {
  if (typeof value === 'boolean') {
    return value
  }
  return value === 'true'
})

export const ListAmenitiesQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().trim().optional(),
    category: z.string().trim().min(1).max(100).optional(),
    isActive: booleanQueryValue.optional(),
  })
  .strict()

export const CreateAmenityBodySchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    icon: z.string().trim().max(100).nullable().optional(),
    category: z.string().trim().min(2).max(100),
    isActive: z.boolean().default(true),
  })
  .strict()

export const UpdateAmenityBodySchema = CreateAmenityBodySchema.partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Vui lòng cung cấp ít nhất một trường để cập nhật tiện ích',
  })

export type TListAmenitiesQuerySchema = z.infer<typeof ListAmenitiesQuerySchema>
export type TCreateAmenityBodySchema = z.infer<typeof CreateAmenityBodySchema>
export type TUpdateAmenityBodySchema = z.infer<typeof UpdateAmenityBodySchema>
