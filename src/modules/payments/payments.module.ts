import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { NotificationsModule } from '@src/modules/notifications/notifications.module'
import { SharedServiceModule } from '@src/shared/modules/services/shared-service.module'
import { PayosModule } from '../payos/payos.module'
import { SubscriptionPaymentsModule } from '../subscription-payments/subscription-payments.module'
import { PaymentsController } from './payments.controller'
import { PaymentsService } from './payments.service'
import { PaymentsRepository } from './repositories/payments.repo'
import { PAYMENTS_MAINTENANCE_QUEUE } from './payments-maintenance.constants'
import { PaymentsMaintenanceProcessor } from './payments-maintenance.processor'
import { PaymentsMaintenanceScheduler } from './payments-maintenance.scheduler'

@Module({
  imports: [
    SharedServiceModule,
    NotificationsModule,
    PayosModule,
    SubscriptionPaymentsModule,
    BullModule.registerQueue({ name: PAYMENTS_MAINTENANCE_QUEUE, forceDisconnectOnShutdown: true }),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository, PaymentsMaintenanceScheduler, PaymentsMaintenanceProcessor],
})
export class PaymentsModule {}
