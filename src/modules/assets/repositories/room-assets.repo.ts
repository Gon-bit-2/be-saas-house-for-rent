import { Injectable } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import type { Prisma } from 'generated/prisma/client'

export const roomAssetSelect = {
  id: true,
  tenantId: true,
  roomId: true,
  categoryId: true,
  name: true,
  quantity: true,
  condition: true,
  description: true,
  imageUrl: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true } },
  room: { select: { id: true, roomCode: true, title: true } },
} satisfies Prisma.RoomAssetSelect

@Injectable()
export class RoomAssetsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(where: Prisma.RoomAssetWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.roomAsset.findMany({
        where,
        skip,
        take,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select: roomAssetSelect,
      }),
      this.prisma.roomAsset.count({ where }),
    ])
  }

  findById(tenantId: number, id: number) {
    return this.prisma.roomAsset.findFirst({ where: { id, tenantId, deletedAt: null }, select: roomAssetSelect })
  }

  getRoom(tenantId: number, roomId: number) {
    return this.prisma.room.findFirst({ where: { id: roomId, tenantId, deletedAt: null }, select: { id: true } })
  }

  getCategory(tenantId: number, categoryId: number) {
    return this.prisma.assetCategory.findFirst({
      where: { id: categoryId, tenantId, deletedAt: null },
      select: { id: true },
    })
  }

  create(
    tenantId: number,
    roomId: number,
    actorId: number,
    data: Omit<Prisma.RoomAssetUncheckedCreateInput, 'tenantId' | 'roomId'>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.roomAsset.create({
        data: { ...data, tenantId, roomId, createdById: actorId, updatedById: actorId },
        select: roomAssetSelect,
      })
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId,
          action: 'CREATE_ROOM_ASSET',
          entityType: 'ROOM_ASSET',
          entityId: String(created.id),
          newValues: { roomId, name: created.name, quantity: created.quantity, condition: created.condition },
        },
      })
      return created
    })
  }

  update(tenantId: number, id: number, actorId: number, data: Prisma.RoomAssetUncheckedUpdateInput) {
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.roomAsset.findFirstOrThrow({
        where: { id, tenantId, deletedAt: null },
        select: { name: true, quantity: true, condition: true, categoryId: true },
      })
      const updated = await tx.roomAsset.update({
        where: { id },
        data: { ...data, updatedById: actorId },
        select: roomAssetSelect,
      })
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId,
          action: 'UPDATE_ROOM_ASSET',
          entityType: 'ROOM_ASSET',
          entityId: String(id),
          oldValues: previous,
          newValues: {
            name: updated.name,
            quantity: updated.quantity,
            condition: updated.condition,
            categoryId: updated.categoryId,
          },
        },
      })
      return updated
    })
  }

  delete(tenantId: number, id: number, actorId: number) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.roomAsset.update({
        where: { id },
        data: { deletedAt: new Date(), deletedById: actorId, updatedById: actorId },
        select: roomAssetSelect,
      })
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId,
          action: 'DELETE_ROOM_ASSET',
          entityType: 'ROOM_ASSET',
          entityId: String(id),
          oldValues: { deletedAt: null },
          newValues: { deletedAt: new Date().toISOString() },
        },
      })
      return updated
    })
  }
}
