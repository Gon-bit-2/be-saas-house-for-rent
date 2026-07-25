import z from 'zod'

const MarketplaceStatusSchema = z.enum(['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'HIDDEN'])
const RoomStatusSchema = z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE', 'INACTIVE'])

export const ListAdminMarketplaceRoomsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().trim().min(1).optional(),
    marketplaceStatus: MarketplaceStatusSchema.optional(),
    roomStatus: RoomStatusSchema.optional(),
    tenantId: z.coerce.number().int().positive().optional(),
    province: z.string().trim().min(1).max(100).optional(),
    district: z.string().trim().min(1).max(100).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .strict()
  .refine((value) => !value.from || !value.to || value.from.getTime() <= value.to.getTime(), {
    message: 'Khoảng thời gian marketplace không hợp lệ',
  })

export const MarketplaceModerationHistoryQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict()

export const UpdateAdminMarketplaceStatusBodySchema = z
  .object({
    marketplaceStatus: z.enum(['PUBLISHED', 'REJECTED', 'HIDDEN']),
    reason: z.string().trim().min(3).max(2000).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if ((value.marketplaceStatus === 'REJECTED' || value.marketplaceStatus === 'HIDDEN') && !value.reason) {
      context.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'Vui lòng cung cấp lý do từ chối hoặc ẩn tin',
      })
    }
  })

export type TListAdminMarketplaceRoomsQuerySchema = z.infer<typeof ListAdminMarketplaceRoomsQuerySchema>
export type TMarketplaceModerationHistoryQuerySchema = z.infer<typeof MarketplaceModerationHistoryQuerySchema>
export type TUpdateAdminMarketplaceStatusBodySchema = z.infer<typeof UpdateAdminMarketplaceStatusBodySchema>
