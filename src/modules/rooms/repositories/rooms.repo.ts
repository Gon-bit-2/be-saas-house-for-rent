import { Injectable } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import type { MarketplaceStatus, Prisma } from 'generated/prisma/client'

const roomImageSelect = {
  id: true,
  roomId: true,
  url: true,
  caption: true,
  sortOrder: true,
  isThumbnail: true,
  createdAt: true,
} satisfies Prisma.RoomImageSelect

const roomImageInternalSelect = {
  ...roomImageSelect,
  publicId: true,
} satisfies Prisma.RoomImageSelect

export const roomSelect = {
  id: true,
  tenantId: true,
  propertyId: true,
  floorId: true,
  roomCode: true,
  title: true,
  area: true,
  maxOccupants: true,
  basePrice: true,
  depositAmount: true,
  electricityPrice: true,
  waterPrice: true,
  description: true,
  status: true,
  marketplaceStatus: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  createdById: true,
  updatedById: true,
  property: {
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      province: true,
      district: true,
      ward: true,
      addressDetail: true,
    },
  },
  floor: {
    select: {
      id: true,
      name: true,
      floorNumber: true,
    },
  },
  images: {
    orderBy: [{ isThumbnail: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }],
    select: roomImageSelect,
  },
  amenities: {
    select: {
      amenity: {
        select: {
          id: true,
          name: true,
          icon: true,
          category: true,
          isActive: true,
        },
      },
    },
  },
} satisfies Prisma.RoomSelect

type CreateImageInput = {
  url: string
  publicId: string
  caption?: string | null
  sortOrder: number
  isThumbnail: boolean
}

/**
 * Repository encapsulating tenant-scoped room, image, and amenity persistence operations.
 */
@Injectable()
export class RoomsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(where: Prisma.RoomWhereInput, skip: number, take: number) {
    return this.prismaService.$transaction([
      this.prismaService.room.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }],
        select: roomSelect,
      }),
      this.prismaService.room.count({ where }),
    ])
  }

  async findById(tenantId: number, id: number) {
    return this.prismaService.room.findFirst({ where: { id, tenantId, deletedAt: null }, select: roomSelect })
  }

  async findPropertyForRoom(tenantId: number, propertyId: number) {
    return this.prismaService.property.findFirst({
      where: { id: propertyId, tenantId, deletedAt: null },
      select: { id: true, status: true },
    })
  }

  async findFloorForProperty(tenantId: number, propertyId: number, floorId: number) {
    return this.prismaService.floor.findFirst({
      where: { id: floorId, tenantId, propertyId, property: { deletedAt: null } },
      select: { id: true },
    })
  }

  async findRoomByPropertyCode(propertyId: number, roomCode: string, excludedRoomId?: number) {
    return this.prismaService.room.findFirst({
      where: {
        propertyId,
        roomCode,
        ...(excludedRoomId ? { id: { not: excludedRoomId } } : {}),
      },
      select: { id: true },
    })
  }

  /**
   * Creates a room and its room-amenity join records atomically.
   */
  async create(data: Prisma.RoomUncheckedCreateInput, amenityIds: number[]) {
    return this.prismaService.$transaction(async (tx) => {
      const room = await tx.room.create({ data, select: { id: true } })
      if (amenityIds.length > 0) {
        await tx.roomAmenity.createMany({
          data: amenityIds.map((amenityId) => ({ roomId: room.id, amenityId })),
          skipDuplicates: true,
        })
      }

      return tx.room.findUniqueOrThrow({ where: { id: room.id }, select: roomSelect })
    })
  }

  async update(id: number, data: Prisma.RoomUncheckedUpdateInput) {
    return this.prismaService.room.update({ where: { id }, data, select: roomSelect })
  }

  async updateStatus(
    id: number,
    status: Prisma.RoomUpdateInput['status'],
    actorId: number,
    fromStatus: MarketplaceStatus,
  ) {
    return this.prismaService.$transaction(async (tx) => {
      const shouldHide = status !== 'AVAILABLE' && fromStatus !== 'HIDDEN'
      await tx.room.update({
        where: { id },
        data: { status, ...(status !== 'AVAILABLE' ? { marketplaceStatus: 'HIDDEN' } : {}), updatedById: actorId },
      })
      if (shouldHide) {
        const room = await tx.room.findUniqueOrThrow({ where: { id }, select: { tenantId: true } })
        await tx.marketplaceModeration.create({
          data: {
            roomId: id,
            tenantId: room.tenantId,
            actorId,
            fromStatus,
            toStatus: 'HIDDEN',
            reason: 'AUTO_ROOM_STATUS_CHANGED',
          },
        })
      }
      return tx.room.findUniqueOrThrow({ where: { id }, select: roomSelect })
    })
  }

  async updateMarketplace(id: number, actorId: number, fromStatus: MarketplaceStatus, toStatus: MarketplaceStatus) {
    return this.prismaService.$transaction(async (tx) => {
      const updated = await tx.room.updateMany({
        where: { id, marketplaceStatus: fromStatus },
        data: {
          marketplaceStatus: toStatus,
          ...(toStatus === 'PENDING_REVIEW' || toStatus === 'DRAFT' ? { publishedAt: null } : {}),
          updatedById: actorId,
        },
      })
      if (updated.count !== 1) {
        return null
      }

      const room = await tx.room.findUniqueOrThrow({ where: { id }, select: { tenantId: true } })
      await tx.marketplaceModeration.create({
        data: {
          roomId: id,
          tenantId: room.tenantId,
          actorId,
          fromStatus,
          toStatus,
        },
      })
      return tx.room.findUniqueOrThrow({ where: { id }, select: roomSelect })
    })
  }

  async countActiveAmenities(amenityIds: number[]) {
    if (amenityIds.length === 0) {
      return 0
    }
    return this.prismaService.amenity.count({ where: { id: { in: amenityIds }, isActive: true } })
  }

  /**
   * Replaces all amenities assigned to a room in a single transaction.
   */
  async replaceRoomAmenities(roomId: number, amenityIds: number[]) {
    return this.prismaService.$transaction(async (tx) => {
      await tx.roomAmenity.deleteMany({ where: { roomId } })
      if (amenityIds.length > 0) {
        await tx.roomAmenity.createMany({
          data: amenityIds.map((amenityId) => ({ roomId, amenityId })),
          skipDuplicates: true,
        })
      }
      return tx.room.findUniqueOrThrow({ where: { id: roomId }, select: roomSelect })
    })
  }

  async countImages(roomId: number) {
    return this.prismaService.roomImage.count({ where: { roomId } })
  }

  /**
   * Persists uploaded images and ensures only one thumbnail remains for the room.
   */
  async createImages(roomId: number, images: CreateImageInput[]) {
    return this.prismaService.$transaction(async (tx) => {
      if (images.some((image) => image.isThumbnail)) {
        await tx.roomImage.updateMany({ where: { roomId }, data: { isThumbnail: false } })
      }

      await tx.roomImage.createMany({
        data: images.map((image) => ({
          roomId,
          url: image.url,
          publicId: image.publicId,
          caption: image.caption ?? null,
          sortOrder: image.sortOrder,
          isThumbnail: image.isThumbnail,
        })),
      })

      return tx.room.findUniqueOrThrow({ where: { id: roomId }, select: roomSelect })
    })
  }

  async findTenantImage(tenantId: number, roomId: number, imageId: number) {
    return this.prismaService.roomImage.findFirst({
      where: { id: imageId, roomId, room: { tenantId, deletedAt: null } },
      select: roomImageInternalSelect,
    })
  }

  /**
   * Updates an image and unsets existing thumbnails when the image becomes the thumbnail.
   */
  async updateImage(roomId: number, imageId: number, data: Prisma.RoomImageUncheckedUpdateInput) {
    return this.prismaService.$transaction(async (tx) => {
      if (data.isThumbnail === true) {
        await tx.roomImage.updateMany({ where: { roomId }, data: { isThumbnail: false } })
      }

      return tx.roomImage.update({ where: { id: imageId }, data, select: roomImageSelect })
    })
  }

  async deleteImage(imageId: number) {
    return this.prismaService.roomImage.delete({ where: { id: imageId }, select: roomImageInternalSelect })
  }

  async softDelete(tenantId: number, id: number, actorId: number, fromStatus: MarketplaceStatus) {
    return this.prismaService.$transaction(async (tx) => {
      const room = await tx.room.update({
        where: { id, tenantId },
        data: {
          deletedAt: new Date(),
          deletedById: actorId,
          marketplaceStatus: 'HIDDEN',
        },
        select: roomSelect,
      })
      if (fromStatus !== 'HIDDEN') {
        await tx.marketplaceModeration.create({
          data: {
            roomId: id,
            tenantId,
            actorId,
            fromStatus,
            toStatus: 'HIDDEN',
            reason: 'AUTO_ROOM_DELETED',
          },
        })
      }
      return room
    })
  }
}
