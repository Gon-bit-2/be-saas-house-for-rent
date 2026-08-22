import { Injectable } from '@nestjs/common'
import type { Prisma, ConversationType } from 'generated/prisma/client'
import { PrismaService } from '@src/shared/modules/database/prisma.service'

@Injectable()
export class ConversationsRepo {
  constructor(private readonly prismaService: PrismaService) {}

  async create(data: Prisma.ConversationUncheckedCreateInput) {
    return this.prismaService.conversation.create({ data })
  }

  async findById(id: number) {
    return this.prismaService.conversation.findUnique({
      where: { id },
      include: {
        members: true,
      },
    })
  }

  async findByUserAndType(userId: number, type: ConversationType, tenantId: number) {
    return this.prismaService.conversation.findFirst({
      where: {
        type,
        tenantId,
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: true,
      },
    })
  }

  async findByUserId(userId: number) {
    return this.prismaService.conversation.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async addMember(conversationId: number, userId: number) {
    return this.prismaService.conversationMember.create({
      data: {
        conversationId,
        userId,
      },
    })
  }
}
