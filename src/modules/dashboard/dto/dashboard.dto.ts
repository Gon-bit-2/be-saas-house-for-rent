import { createZodDto } from 'nestjs-zod'
import { DashboardSummaryQuerySchema, RecentActivityQuerySchema, RevenueTrendQuerySchema } from '../model/dashboard.model'

export class DashboardSummaryQueryDTO extends createZodDto(DashboardSummaryQuerySchema) {}
export class RevenueTrendQueryDTO extends createZodDto(RevenueTrendQuerySchema) {}
export class RecentActivityQueryDTO extends createZodDto(RecentActivityQuerySchema) {}
