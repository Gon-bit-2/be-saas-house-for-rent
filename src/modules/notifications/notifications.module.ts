import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { SharedServiceModule } from '@src/shared/modules/services/shared-service.module'
import { FirebaseProvider } from './firebase.provider'
import { FirebasePushService } from './firebase-push.service'
import { NotificationEventsService } from './notification-events.service'
import { NOTIFICATIONS_QUEUE } from './notifications.constants'
import { NotificationsController } from './notifications.controller'
import { NotificationsGateway } from './notifications.gateway'
import { NotificationsProcessor } from './notifications.processor'
import { NotificationsService } from './notifications.service'
import { NotificationsRepository } from './repositories/notifications.repo'

@Module({
  imports: [SharedServiceModule, BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE })],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationEventsService,
    NotificationsRepository,
    NotificationsGateway,
    NotificationsProcessor,
    FirebaseProvider,
    FirebasePushService,
  ],
  exports: [NotificationEventsService, NotificationsService],
})
export class NotificationsModule {}
