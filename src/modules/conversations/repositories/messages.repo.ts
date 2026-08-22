import { Injectable } from '@nestjs/common'
import type { Prisma } from 'generated/prisma/client'
import { PrismaService } from '@src/shared/modules/database/prisma.service'

@Injectable()
export class MessagesRepo {
  constructor(private readonly prismaService: PrismaService) {}

  async create(data: Prisma.MessageUncheckedCreateInput) {
    return this.prismaService.message.create({
      data,
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    })
  }

  async findByConversationId(conversationId: number, skip = 0, take = 50) {
    return this.prismaService.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    })
  }

  async countByConversationId(conversationId: number) {
    return this.prismaService.message.count({
      where: {
        conversationId,
        deletedAt: null,
      },
    })
  }

  async markAsRead(conversationId: number, userId: number) {
    return this.prismaService.message.updateMany({
      where: {
        conversationId,
        readAt: null,
        senderId: { not: userId }, // Mark messages sent by others as read
      },
      data: {
        readAt: new Date(),
      },
    })
  }
}
