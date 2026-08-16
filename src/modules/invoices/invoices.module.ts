import { Module } from '@nestjs/common'
import { NotificationsModule } from '@src/modules/notifications/notifications.module'
import { SharedServiceModule } from '@src/shared/modules/services/shared-service.module'
import { InvoicesController } from './invoices.controller'
import { InvoicesScheduler } from './invoices.scheduler'
import { InvoicesService } from './invoices.service'
import { InvoicesRepository } from './repositories/invoices.repo'

/**
 * Module for monthly invoices and their debt ledger entries.
 */
@Module({
  imports: [SharedServiceModule, NotificationsModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicesRepository, InvoicesScheduler],
})
export class InvoicesModule {}
