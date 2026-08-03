import { Module } from '@nestjs/common'
import { ServiceChargesController } from './service-charges.controller'
import { ServiceChargesRepository } from './repositories/service-charges.repo'
import { ServiceChargesService } from './service-charges.service'

@Module({
  controllers: [ServiceChargesController],
  providers: [ServiceChargesService, ServiceChargesRepository],
  exports: [ServiceChargesService, ServiceChargesRepository],
})
export class ServiceChargesModule {}
