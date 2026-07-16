import { Module } from '@nestjs/common'
import { PlansController } from './plans.controller'
import { PlansRepository } from './repositories/plans.repo'
import { PlansService } from './plans.service'

@Module({
  controllers: [PlansController],
  providers: [PlansService, PlansRepository],
  exports: [PlansService, PlansRepository],
})
export class PlansModule {}
