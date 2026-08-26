import { Module } from '@nestjs/common'
import { SharedServiceModule } from '@src/shared/modules/services/shared-service.module'
import { InvoicesModule } from '@src/modules/invoices/invoices.module'
import { ContractsController } from './contracts.controller'
import { ContractsService } from './contracts.service'
import { ContractsRepository } from './repositories/contracts.repo'

/**
 * Module that owns rental contract workflows.
 */
@Module({
  imports: [SharedServiceModule, InvoicesModule],
  controllers: [ContractsController],
  providers: [ContractsService, ContractsRepository],
})
export class ContractsModule {}
