import { Module } from '@nestjs/common'
import { SharedServiceModule } from '@src/shared/modules/services/shared-service.module'
import { ContractsController } from './contracts.controller'
import { ContractsService } from './contracts.service'
import { ContractsRepository } from './repositories/contracts.repo'

/**
 * Module that owns rental contract workflows.
 */
@Module({
  imports: [SharedServiceModule],
  controllers: [ContractsController],
  providers: [ContractsService, ContractsRepository],
})
export class ContractsModule {}
