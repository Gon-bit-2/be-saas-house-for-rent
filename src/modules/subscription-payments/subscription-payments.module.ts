import { Module } from '@nestjs/common'
import { PayosModule } from '../payos/payos.module'
import { SubscriptionPaymentsRepository } from './repositories/subscription-payments.repo'
import { SubscriptionPaymentsController } from './subscription-payments.controller'
import { SubscriptionPaymentsService } from './subscription-payments.service'

@Module({
  imports: [PayosModule],
  controllers: [SubscriptionPaymentsController],
  providers: [SubscriptionPaymentsService, SubscriptionPaymentsRepository],
  exports: [SubscriptionPaymentsService],
})
export class SubscriptionPaymentsModule {}
