import { Injectable } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import type { MarketplaceStatus, Prisma } from 'generated/prisma/client'

const adminMarketplaceRoomSelect = {
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
  description: true,
  status: true,
  marketplaceStatus: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
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
      deletedAt: true,
    },
  },
  tenant: {
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      verificationStatus: true,
      deletedAt: true,
      owner: { select: { id: true, fullName: true, email: true, phone: true, status: true } },
    },
  },
  images: {
    orderBy: [{ isThumbnail: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }],
    select: { id: true, url: true, caption: true, isThumbnail: true, sortOrder: true },
  },
  marketplaceModerations: {
    take: 1,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      reason: true,
      createdAt: true,
      actor: { select: { id: true, fullName: true, email: true } },
    },
  },
} satisfies Prisma.RoomSelect

const moderationSelect = {
  id: true,
  roomId: true,
  tenantId: true,
  actorId: true,
  fromStatus: true,
  toStatus: true,
  reason: true,
  createdAt: true,
  actor: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.MarketplaceModerationSelect

type UpdateInput = {
  actorId: number
  fromStatus: MarketplaceStatus
  toStatus: MarketplaceStatus
  reason?: string
  requirePublishEligibility: boolean
}

@Injectable()
export class MarketplaceAdminRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(where: Prisma.RoomWhereInput, skip: number, take: number) {
    return this.prismaService.$transaction([
      this.prismaService.room.findMany({
        where,
        skip,
        take,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        select: adminMarketplaceRoomSelect,
      }),
      this.prismaService.room.count({ where }),
    ])
  }

  async findById(id: number) {
    return this.prismaService.room.findFirst({
      where: { id, deletedAt: null },
      select: adminMarketplaceRoomSelect,
    })
  }

  async findHistory(roomId: number, skip: number, take: number) {
    const where = { roomId }
    return this.prismaService.$transaction([
      this.prismaService.marketplaceModeration.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: moderationSelect,
      }),
      this.prismaService.marketplaceModeration.count({ where }),
    ])
  }

  async update(id: number, input: UpdateInput) {
    return this.prismaService.$transaction(async (tx) => {
      const updated = await tx.room.updateMany({
        where: {
          id,
          deletedAt: null,
          marketplaceStatus: input.fromStatus,
          ...(input.requirePublishEligibility
            ? {
                status: 'AVAILABLE',
                images: { some: {} },
                property: { status: 'ACTIVE', deletedAt: null },
                tenant: { status: 'ACTIVE', deletedAt: null },
              }
            : {}),
        },
        data: {
          marketplaceStatus: input.toStatus,
          ...(input.toStatus === 'PUBLISHED' ? { publishedAt: new Date() } : {}),
          updatedById: input.actorId,
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
          actorId: input.actorId,
          fromStatus: input.fromStatus,
          toStatus: input.toStatus,
          reason: input.reason ?? null,
        },
      })

      return tx.room.findUniqueOrThrow({ where: { id }, select: adminMarketplaceRoomSelect })
    })
  }
}
