import { Module } from '@nestjs/common'
import { NotificationsModule } from '@src/modules/notifications/notifications.module'
import { SharedServiceModule } from '@src/shared/modules/services/shared-service.module'
import { HandoversController } from './handovers.controller'
import { HandoversService } from './handovers.service'
import { HandoversRepository } from './repositories/handovers.repo'

@Module({
  imports: [SharedServiceModule, NotificationsModule],
  controllers: [HandoversController],
  providers: [HandoversService, HandoversRepository],
  exports: [HandoversRepository],
})
export class HandoversModule {}
