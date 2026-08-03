import z from 'zod'
import { IsoDateInputCodec } from '@src/common/utils/date-codec.util'

const DateRangeQuerySchema = z
  .object({
    from: IsoDateInputCodec.optional(),
    to: IsoDateInputCodec.optional(),
  })
  .strict()

export const DashboardSummaryQuerySchema = DateRangeQuerySchema

export const RevenueTrendQuerySchema = DateRangeQuerySchema.extend({
  groupBy: z.enum(['day', 'month']).optional(),
})

export const RecentActivityQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(50).default(10),
  })
  .strict()

export type TDashboardSummaryQuerySchema = z.infer<typeof DashboardSummaryQuerySchema>
export type TRevenueTrendQuerySchema = z.infer<typeof RevenueTrendQuerySchema>
export type TRecentActivityQuerySchema = z.infer<typeof RecentActivityQuerySchema>
export type DashboardTrendGroupBy = 'day' | 'month'
