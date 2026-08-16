import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import { marketplaceRoomSelect } from './repositories/marketplace.repo'

@Injectable()
export class FavoriteService {
  constructor(private readonly prismaService: PrismaService) {}

  async getFavorites(userId: number) {
    const favorites = await this.prismaService.favoriteRoom.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        room: {
          select: marketplaceRoomSelect,
        },
      },
    })

    return favorites.map((fav) => {
      const { tenantId, property, ...publicRoom } = fav.room
      void tenantId
      const { addressDetail, latitude, longitude, ...publicProperty } = property
      void addressDetail
      void latitude
      void longitude
      return {
        ...publicRoom,
        property: publicProperty,
        favoritedAt: fav.createdAt,
      }
    })
  }

  async addFavorite(userId: number, roomId: number) {
    // Check if room exists and is published
    const room = await this.prismaService.room.findFirst({
      where: {
        id: roomId,
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

    const favorite = await this.prismaService.favoriteRoom.upsert({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
      update: {},
      create: {
        userId,
        roomId,
      },
    })

    return { success: true, data: favorite }
  }

  async removeFavorite(userId: number, roomId: number) {
    try {
      await this.prismaService.favoriteRoom.delete({
        where: {
          userId_roomId: {
            userId,
            roomId,
          },
        },
      })
    } catch (error) {
      // Ignore if not found, making it idempotent
    }

    return { success: true }
  }
}
