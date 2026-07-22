import z from 'zod'

const RoomStatusSchema = z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE', 'INACTIVE'])
const MarketplaceStatusSchema = z.enum(['DRAFT', 'HIDDEN', 'PUBLISHED'])

export const ListRoomsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().trim().min(1).optional(),
    propertyId: z.coerce.number().int().positive().optional(),
    floorId: z.coerce.number().int().positive().optional(),
    status: RoomStatusSchema.optional(),
    marketplaceStatus: z.enum(['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'HIDDEN']).optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    minArea: z.coerce.number().nonnegative().optional(),
    maxArea: z.coerce.number().nonnegative().optional(),
  })
  .strict()

export const CreateRoomBodySchema = z
  .object({
    propertyId: z.coerce.number().int().positive(),
    floorId: z.coerce.number().int().positive().nullable().optional(),
    roomCode: z.string().trim().min(1).max(50),
    title: z.string().trim().min(2).max(255),
    area: z.coerce.number().positive(),
    maxOccupants: z.coerce.number().int().positive(),
    basePrice: z.coerce.number().nonnegative(),
    depositAmount: z.coerce.number().nonnegative(),
    electricityPrice: z.coerce.number().nonnegative(),
    waterPrice: z.coerce.number().nonnegative(),
    description: z.string().trim().max(5000).nullable().optional(),
    status: RoomStatusSchema.default('AVAILABLE'),
    amenityIds: z.array(z.coerce.number().int().positive()).max(100).default([]),
  })
  .strict()

export const UpdateRoomBodySchema = CreateRoomBodySchema.omit({ propertyId: true, amenityIds: true, status: true })
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Vui lòng cung cấp ít nhất một trường để cập nhật phòng',
  })

export const UpdateRoomStatusBodySchema = z.object({ status: RoomStatusSchema }).strict()
export const UpdateRoomMarketplaceBodySchema = z.object({ marketplaceStatus: MarketplaceStatusSchema }).strict()
export const ReplaceRoomAmenitiesBodySchema = z
  .object({ amenityIds: z.array(z.coerce.number().int().positive()).max(100).default([]) })
  .strict()

export const UpdateRoomImageBodySchema = z
  .object({
    caption: z.string().trim().max(255).nullable().optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
    isThumbnail: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Vui lòng cung cấp ít nhất một trường để cập nhật ảnh phòng',
  })

export type TListRoomsQuerySchema = z.infer<typeof ListRoomsQuerySchema>
export type TCreateRoomBodySchema = z.infer<typeof CreateRoomBodySchema>
export type TUpdateRoomBodySchema = z.infer<typeof UpdateRoomBodySchema>
export type TUpdateRoomStatusBodySchema = z.infer<typeof UpdateRoomStatusBodySchema>
export type TUpdateRoomMarketplaceBodySchema = z.infer<typeof UpdateRoomMarketplaceBodySchema>
export type TReplaceRoomAmenitiesBodySchema = z.infer<typeof ReplaceRoomAmenitiesBodySchema>
export type TUpdateRoomImageBodySchema = z.infer<typeof UpdateRoomImageBodySchema>

