import { Injectable } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import type { Prisma } from 'generated/prisma/client'

const categorySelect = {
  id: true,
  tenantId: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { roomAssets: { where: { deletedAt: null } } } },
} satisfies Prisma.AssetCategorySelect

@Injectable()
export class AssetCategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(where: Prisma.AssetCategoryWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.assetCategory.findMany({ where, skip, take, orderBy: { name: 'asc' }, select: categorySelect }),
      this.prisma.assetCategory.count({ where }),
    ])
  }

  findById(tenantId: number, id: number) {
    return this.prisma.assetCategory.findFirst({ where: { id, tenantId, deletedAt: null }, select: categorySelect })
  }

  create(tenantId: number, actorId: number, data: { name: string; description?: string | null }) {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.assetCategory.create({
        data: { tenantId, ...data, createdById: actorId, updatedById: actorId },
        select: categorySelect,
      })
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId,
          action: 'CREATE_ASSET_CATEGORY',
          entityType: 'ASSET_CATEGORY',
          entityId: String(created.id),
          newValues: { name: created.name },
        },
      })
      return created
    })
  }

  update(tenantId: number, id: number, actorId: number, data: Prisma.AssetCategoryUncheckedUpdateInput) {
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.assetCategory.findFirstOrThrow({
        where: { id, tenantId, deletedAt: null },
        select: { name: true, description: true },
      })
      const updated = await tx.assetCategory.update({
        where: { id },
        data: { ...data, updatedById: actorId },
        select: categorySelect,
      })
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId,
          action: 'UPDATE_ASSET_CATEGORY',
          entityType: 'ASSET_CATEGORY',
          entityId: String(id),
          oldValues: previous,
          newValues: { name: updated.name, description: updated.description },
        },
      })
      return updated
    })
  }

  delete(tenantId: number, id: number, actorId: number) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.assetCategory.update({
        where: { id },
        data: { deletedAt: new Date(), deletedById: actorId, updatedById: actorId },
        select: categorySelect,
      })
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId,
          action: 'DELETE_ASSET_CATEGORY',
          entityType: 'ASSET_CATEGORY',
          entityId: String(id),
          oldValues: { deletedAt: null },
          newValues: { deletedAt: new Date().toISOString() },
        },
      })
      return updated
    })
  }
}
