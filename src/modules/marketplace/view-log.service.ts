import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import { marketplaceRoomSelect } from './repositories/marketplace.repo'

@Injectable()
export class ViewLogService {
  constructor(private readonly prismaService: PrismaService) {}

  async getViewHistory(userId: number) {
    const logs = await this.prismaService.roomViewLog.findMany({
      where: { userId },
      orderBy: { viewedAt: 'desc' },
      distinct: ['roomId'], // Lấy log mới nhất cho mỗi phòng
      include: {
        room: {
          select: marketplaceRoomSelect,
        },
      },
    })

    return logs.map((log) => {
      const { tenantId, property, ...publicRoom } = log.room
      void tenantId
      const { addressDetail, latitude, longitude, ...publicProperty } = property
      void addressDetail
      void latitude
      void longitude
      return {
        ...publicRoom,
        property: publicProperty,
        viewedAt: log.viewedAt,
      }
    })
  }

  async recordView(data: { userId?: number; roomId: number; ipAddress?: string; userAgent?: string }) {
    // Check if room exists
    const room = await this.prismaService.room.findFirst({
      where: {
        id: data.roomId,
        deletedAt: null,
        status: 'AVAILABLE',
        marketplaceStatus: 'PUBLISHED',
        tenant: { deletedAt: null, status: 'ACTIVE' },
        property: { deletedAt: null, status: 'ACTIVE' },
      },
    })

    if (!room) {
      throw new NotFoundException('Phòng không tồn tại hoặc không đang hiển thị trên marketplace')
    }

    if (data.userId) {
      // Check for recent views by this user for this room to avoid spam
      const recentLog = await this.prismaService.roomViewLog.findFirst({
        where: {
          userId: data.userId,
          roomId: data.roomId,
          viewedAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000), // Within last 1 hour
          },
        },
      })

      if (recentLog) {
        return { success: true, message: 'View already logged recently' }
      }
    }

    await this.prismaService.roomViewLog.create({
      data: {
        userId: data.userId,
        roomId: data.roomId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    })

    return { success: true }
  }
}
