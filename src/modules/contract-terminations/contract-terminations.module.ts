import { Module } from '@nestjs/common'
import { NotificationsModule } from '@src/modules/notifications/notifications.module'
import { SharedServiceModule } from '@src/shared/modules/services/shared-service.module'
import { ContractTerminationsController } from './contract-terminations.controller'
import { ContractTerminationsService } from './contract-terminations.service'
import { ContractTerminationsRepository } from './repositories/contract-terminations.repo'

@Module({
  imports: [SharedServiceModule, NotificationsModule],
  controllers: [ContractTerminationsController],
  providers: [ContractTerminationsService, ContractTerminationsRepository],
})
export class ContractTerminationsModule {}
