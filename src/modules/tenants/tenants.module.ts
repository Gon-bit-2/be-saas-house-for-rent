import { Module } from '@nestjs/common'
import { SubscriptionPaymentsModule } from '../subscription-payments/subscription-payments.module'
import { TenantsController } from './tenants.controller'
import { TenantsRepository } from './repositories/tenants.repo'
import { TenantsService } from './tenants.service'

@Module({
  imports: [SubscriptionPaymentsModule],
  controllers: [TenantsController],
  providers: [TenantsService, TenantsRepository],
  exports: [TenantsService, TenantsRepository],
})
export class TenantsModule {}
