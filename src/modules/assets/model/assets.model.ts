import z from 'zod'

const AssetConditionSchema = z.enum(['NEW', 'GOOD', 'NORMAL', 'DAMAGED', 'LOST'])
const PageSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().min(1).max(255).optional(),
})

export const ListAssetCategoriesQuerySchema = PageSchema.strict()
export const CreateAssetCategoryBodySchema = z
  .object({ name: z.string().trim().min(1).max(100), description: z.string().trim().max(2000).nullable().optional() })
  .strict()
export const UpdateAssetCategoryBodySchema = CreateAssetCategoryBodySchema.partial().refine(
  (body) => Object.keys(body).length > 0,
  'Cần cung cấp ít nhất một trường để cập nhật',
)

export const ListRoomAssetsQuerySchema = PageSchema.extend({
  condition: AssetConditionSchema.optional(),
  categoryId: z.coerce.number().int().positive().optional(),
}).strict()
const RoomAssetShape = {
  categoryId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(255),
  quantity: z.coerce.number().int().positive().max(10_000),
  condition: AssetConditionSchema,
  description: z.string().trim().max(2000).nullable().optional(),
  imageUrl: z.string().url().max(2000).nullable().optional(),
}
export const CreateRoomAssetBodySchema = z
  .object({ ...RoomAssetShape, condition: AssetConditionSchema.default('GOOD') })
  .strict()
export const UpdateRoomAssetBodySchema = z
  .object(RoomAssetShape)
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, 'Cần cung cấp ít nhất một trường để cập nhật')

export type TListAssetCategoriesQuery = z.infer<typeof ListAssetCategoriesQuerySchema>
export type TCreateAssetCategoryBody = z.infer<typeof CreateAssetCategoryBodySchema>
export type TUpdateAssetCategoryBody = z.infer<typeof UpdateAssetCategoryBodySchema>
export type TListRoomAssetsQuery = z.infer<typeof ListRoomAssetsQuerySchema>
export type TCreateRoomAssetBody = z.infer<typeof CreateRoomAssetBodySchema>
export type TUpdateRoomAssetBody = z.infer<typeof UpdateRoomAssetBodySchema>
