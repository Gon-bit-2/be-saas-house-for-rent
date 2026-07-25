import { createZodDto } from 'nestjs-zod'
import {
  PlatformDashboardSummaryQuerySchema,
  PlatformDashboardTrendsQuerySchema,
} from '../model/platform-dashboard.model'

export class PlatformDashboardSummaryQueryDTO extends createZodDto(PlatformDashboardSummaryQuerySchema) {}
export class PlatformDashboardTrendsQueryDTO extends createZodDto(PlatformDashboardTrendsQuerySchema) {}
