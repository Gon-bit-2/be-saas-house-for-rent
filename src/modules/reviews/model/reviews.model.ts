import z from 'zod'
import { IsoDateInputCodec } from '@src/common/utils/date-codec.util'

const ReviewStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'HIDDEN'])

export const CreateReviewBodySchema = z
  .object({
    contractId: z.coerce.number().int().positive(),
    rating: z.coerce.number().int().min(1).max(5),
    content: z.string().trim().min(10).max(2000),
    cleanlinessScore: z.coerce.number().int().min(1).max(5),
    locationScore: z.coerce.number().int().min(1).max(5),
    priceScore: z.coerce.number().int().min(1).max(5),
    serviceScore: z.coerce.number().int().min(1).max(5),
  })
  .strict()

export const ListMyReviewsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: ReviewStatusSchema.optional(),
    roomId: z.coerce.number().int().positive().optional(),
  })
  .strict()

export const ListPublicReviewsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict()

export const ListAdminReviewsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: ReviewStatusSchema.optional(),
    tenantId: z.coerce.number().int().positive().optional(),
    roomId: z.coerce.number().int().positive().optional(),
    reviewerId: z.coerce.number().int().positive().optional(),
    from: IsoDateInputCodec.optional(),
    to: IsoDateInputCodec.optional(),
    search: z.string().trim().min(1).max(255).optional(),
  })
  .strict()

export const UpdateReviewStatusBodySchema = z
  .object({
    status: z.enum(['APPROVED', 'REJECTED', 'HIDDEN']),
    reason: z.string().trim().min(3).max(2000).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (['REJECTED', 'HIDDEN'].includes(value.status) && !value.reason) {
      ctx.addIssue({ code: 'custom', path: ['reason'], message: 'Lý do là bắt buộc với trạng thái này' })
    }
  })

export type TCreateReviewBody = z.infer<typeof CreateReviewBodySchema>
export type TListMyReviewsQuery = z.infer<typeof ListMyReviewsQuerySchema>
export type TListPublicReviewsQuery = z.infer<typeof ListPublicReviewsQuerySchema>
export type TListAdminReviewsQuery = z.infer<typeof ListAdminReviewsQuerySchema>
export type TUpdateReviewStatusBody = z.infer<typeof UpdateReviewStatusBodySchema>
