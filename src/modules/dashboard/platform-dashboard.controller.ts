import { Controller, Get, Query } from '@nestjs/common'
import { IsAdmin } from '@src/common/decorators/decorators/roles.decorator'
import { PlatformDashboardSummaryQueryDTO, PlatformDashboardTrendsQueryDTO } from './dto/platform-dashboard.dto'
import { PlatformDashboardService } from './platform-dashboard.service'

@IsAdmin()
@Controller('dashboard/platform')
export class PlatformDashboardController {
  constructor(private readonly platformDashboardService: PlatformDashboardService) {}

  @Get('summary')
  getSummary(@Query() query: PlatformDashboardSummaryQueryDTO) {
    return this.platformDashboardService.getSummary(query)
  }

  @Get('trends')
  getTrends(@Query() query: PlatformDashboardTrendsQueryDTO) {
    return this.platformDashboardService.getTrends(query)
  }
}
