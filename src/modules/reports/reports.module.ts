import { Module } from '@nestjs/common'
import { NotificationsModule } from '@src/modules/notifications/notifications.module'
import { ReportsAdminController } from './reports-admin.controller'
import { ReportsController } from './reports.controller'
import { ReportsService } from './reports.service'
import { ReportsRepository } from './repositories/reports.repo'

@Module({
  imports: [NotificationsModule],
  controllers: [ReportsController, ReportsAdminController],
  providers: [ReportsService, ReportsRepository],
})
export class ReportsModule {}
