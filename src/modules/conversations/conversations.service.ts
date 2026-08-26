import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { ConversationsRepo } from './repositories/conversations.repo'
import { MessagesRepo } from './repositories/messages.repo'
import { CreateConversationBodyDTO, SendMessageBodyDTO } from './dto/conversations.dto'
import { PrismaService } from '@src/shared/modules/database/prisma.service'

@Injectable()
export class ConversationsService {
  constructor(
    private readonly conversationsRepo: ConversationsRepo,
    private readonly messagesRepo: MessagesRepo,
    private readonly prismaService: PrismaService,
  ) {}

  async getUserConversations(userId: number) {
    return this.conversationsRepo.findByUserId(userId)
  }

  async getConversationMessages(conversationId: number, userId: number, skip?: number, take?: number) {
    await this.checkAccess(conversationId, userId)

    const [messages, total] = await Promise.all([
      this.messagesRepo.findByConversationId(conversationId, skip, take),
      this.messagesRepo.countByConversationId(conversationId),
    ])

    return {
      data: messages,
      meta: {
        total,
        skip: skip || 0,
        take: take || 50,
      },
    }
  }

  async findOrCreateConversation(userId: number, dto: CreateConversationBodyDTO) {
    // Check if conversation already exists for this type and tenant
    const existing = await this.conversationsRepo.findByUserAndType(userId, dto.type, dto.tenantId)
    if (existing) {
      return existing
    }

    // Create new conversation
    const conversation = await this.conversationsRepo.create({
      type: dto.type,
      tenantId: dto.tenantId,
      roomId: dto.roomId,
      contractId: dto.contractId,
      ticketId: dto.ticketId,
    })

    // Add current user as member
    await this.conversationsRepo.addMember(conversation.id, userId)

    // Automatically add the Tenant Owner as a member so they can receive messages
    if (dto.tenantId) {
      const tenant = await this.prismaService.tenant.findUnique({
        where: { id: dto.tenantId },
        select: { ownerUserId: true },
      })
      if (tenant && tenant.ownerUserId !== userId) {
        await this.conversationsRepo.addMember(conversation.id, tenant.ownerUserId)
      }
    }

    return this.conversationsRepo.findById(conversation.id)
  }

  async sendMessage(conversationId: number, senderId: number, dto: SendMessageBodyDTO) {
    await this.checkAccess(conversationId, senderId)

    const message = await this.messagesRepo.create({
      conversationId,
      senderId,
      content: dto.content || '',
      messageType: dto.messageType || 'TEXT',
      fileUrl: dto.fileUrl,
    })

    return message
  }

  async markMessagesAsRead(conversationId: number, userId: number) {
    await this.checkAccess(conversationId, userId)
    await this.messagesRepo.markAsRead(conversationId, userId)
  }

  private async checkAccess(conversationId: number, userId: number) {
    const conversation = await this.conversationsRepo.findById(conversationId)
    if (!conversation) {
      throw new NotFoundException('Conversation not found')
    }

    const isMember = conversation.members.some((member) => member.userId === userId)
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this conversation')
    }

    return conversation
  }

  async getConversationById(conversationId: number) {
    return this.conversationsRepo.findById(conversationId)
  }
}
