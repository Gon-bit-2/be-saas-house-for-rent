import z from 'zod'

const PlatformDateRangeShape = {
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
}

export const PlatformDashboardSummaryQuerySchema = z.object(PlatformDateRangeShape).strict()

export const PlatformDashboardTrendsQuerySchema = z
  .object({
    ...PlatformDateRangeShape,
    groupBy: z.enum(['day', 'month']).optional(),
  })
  .strict()

export type TPlatformDashboardSummaryQuerySchema = z.infer<typeof PlatformDashboardSummaryQuerySchema>
export type TPlatformDashboardTrendsQuerySchema = z.infer<typeof PlatformDashboardTrendsQuerySchema>
export type PlatformDashboardGroupBy = 'day' | 'month'
