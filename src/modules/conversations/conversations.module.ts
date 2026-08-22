import { Module } from '@nestjs/common'
import { SharedServiceModule } from '@src/shared/modules/services/shared-service.module'
import { DatabaseModule } from '@src/shared/modules/database/prisma.module'
import { ConversationsController } from './conversations.controller'
import { ConversationsService } from './conversations.service'
import { ConversationsGateway } from './conversations.gateway'
import { ConversationsRepo } from './repositories/conversations.repo'
import { MessagesRepo } from './repositories/messages.repo'

@Module({
  imports: [SharedServiceModule, DatabaseModule],
  controllers: [ConversationsController],
  providers: [ConversationsService, ConversationsGateway, ConversationsRepo, MessagesRepo],
  exports: [ConversationsService],
})
export class ConversationsModule {}
