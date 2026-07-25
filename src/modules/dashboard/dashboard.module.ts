import { Module } from '@nestjs/common'
import { SharedServiceModule } from '@src/shared/modules/services/shared-service.module'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'
import { PlatformDashboardController } from './platform-dashboard.controller'
import { PlatformDashboardService } from './platform-dashboard.service'
import { DashboardRepository } from './repositories/dashboard.repo'
import { PlatformDashboardRepository } from './repositories/platform-dashboard.repo'

@Module({
  imports: [SharedServiceModule],
  controllers: [DashboardController, PlatformDashboardController],
  providers: [DashboardService, DashboardRepository, PlatformDashboardService, PlatformDashboardRepository],
})
export class DashboardModule {}
