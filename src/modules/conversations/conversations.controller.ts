import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common'
import { ConversationsService } from './conversations.service'
import { CreateConversationBodyDTO, SendMessageBodyDTO } from './dto/conversations.dto'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  async getConversations(@ActiveUser() user: AccessTokenPayload) {
    return this.conversationsService.getUserConversations(user.userId)
  }

  @Post()
  async findOrCreateConversation(
    @ActiveUser() user: AccessTokenPayload,
    @Body() createConversationDto: CreateConversationBodyDTO,
  ) {
    return this.conversationsService.findOrCreateConversation(user.userId, createConversationDto)
  }

  @Get(':id/messages')
  async getMessages(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() user: AccessTokenPayload,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : 0
    const takeNum = take ? parseInt(take, 10) : 50
    return this.conversationsService.getConversationMessages(id, user.userId, skipNum, takeNum)
  }

  @Post(':id/messages')
  async sendMessage(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() user: AccessTokenPayload,
    @Body() sendMessageDto: SendMessageBodyDTO,
  ) {
    return this.conversationsService.sendMessage(id, user.userId, sendMessageDto)
  }

  @Post(':id/read')
  async markAsRead(@Param('id', ParseIntPipe) id: number, @ActiveUser() user: AccessTokenPayload) {
    await this.conversationsService.markMessagesAsRead(id, user.userId)
    return { success: true }
  }
}
