import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { NotificationsModule } from '@src/modules/notifications/notifications.module'
import { SharedServiceModule } from '@src/shared/modules/services/shared-service.module'
import { PayosService } from './payos.service'
import { PaymentsController } from './payments.controller'
import { PaymentsService } from './payments.service'
import { PaymentsRepository } from './repositories/payments.repo'
import { PAYMENTS_MAINTENANCE_QUEUE } from './payments-maintenance.constants'
import { PaymentsMaintenanceProcessor } from './payments-maintenance.processor'
import { PaymentsMaintenanceScheduler } from './payments-maintenance.scheduler'

@Module({
  imports: [SharedServiceModule, NotificationsModule, BullModule.registerQueue({ name: PAYMENTS_MAINTENANCE_QUEUE })],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentsRepository,
    PayosService,
    PaymentsMaintenanceScheduler,
    PaymentsMaintenanceProcessor,
  ],
})
export class PaymentsModule {}
