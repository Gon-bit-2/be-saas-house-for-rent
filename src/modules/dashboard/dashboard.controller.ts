import { Controller, Get, Query } from '@nestjs/common'
import roleName from '@src/common/constants/role.constant'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { Roles } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import { DashboardSummaryQueryDTO, RecentActivityQueryDTO, RevenueTrendQueryDTO } from './dto/dashboard.dto'
import { DashboardService } from './dashboard.service'

@Controller('dashboard')
@Roles(roleName.LANDLORD, roleName.MANAGER, roleName.ACCOUNTANT)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(@ActiveUser() user: AccessTokenPayload, @Query() query: DashboardSummaryQueryDTO) {
    return this.dashboardService.getSummary(user.userId, query)
  }

  @Get('revenue-trend')
  getRevenueTrend(@ActiveUser() user: AccessTokenPayload, @Query() query: RevenueTrendQueryDTO) {
    return this.dashboardService.getRevenueTrend(user.userId, query)
  }

  @Get('recent-activity')
  getRecentActivities(@ActiveUser() user: AccessTokenPayload, @Query() query: RecentActivityQueryDTO) {
    return this.dashboardService.getRecentActivities(user.userId, query)
  }
}
