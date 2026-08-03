import { Injectable } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import type { Prisma, ReportStatus, ReportTargetType } from 'generated/prisma/client'

export const reportSelect = {
  id: true,
  reporterId: true,
  targetType: true,
  targetId: true,
  targetTenantId: true,
  targetSnapshot: true,
  reason: true,
  description: true,
  status: true,
  handledBy: true,
  reviewingAt: true,
  resolutionNote: true,
  createdAt: true,
  resolvedAt: true,
  updatedAt: true,
  reporter: { select: { id: true, fullName: true, email: true } },
  handledByUser: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.ReportSelect

type UpdateInput = {
  actorId: number
  expectedStatus: ReportStatus
  status: ReportStatus
  resolutionNote?: string
  requireHandler: boolean
  action: string
}

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(where: Prisma.ReportWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.report.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: reportSelect,
      }),
      this.prisma.report.count({ where }),
    ])
  }

  findById(id: number) {
    return this.prisma.report.findUnique({ where: { id }, select: reportSelect })
  }

  async findTarget(targetType: ReportTargetType, targetId: number) {
    if (targetType === 'ROOM') {
      const room = await this.prisma.room.findFirst({
        where: {
          id: targetId,
          deletedAt: null,
          status: 'AVAILABLE',
          marketplaceStatus: 'PUBLISHED',
          tenant: { deletedAt: null, status: 'ACTIVE' },
          property: { deletedAt: null, status: 'ACTIVE' },
        },
        select: { id: true, tenantId: true, title: true, roomCode: true, marketplaceStatus: true },
      })
      return room
        ? {
            targetTenantId: room.tenantId,
            ownerId: null,
            snapshot: {
              id: room.id,
              tenantId: room.tenantId,
              title: room.title,
              roomCode: room.roomCode,
              marketplaceStatus: room.marketplaceStatus,
            },
          }
        : null
    }

    if (targetType === 'TENANT') {
      const tenant = await this.prisma.tenant.findFirst({
        where: { id: targetId, deletedAt: null, status: 'ACTIVE' },
        select: { id: true, name: true, status: true, verificationStatus: true },
      })
      return tenant
        ? {
            targetTenantId: tenant.id,
            ownerId: null,
            snapshot: {
              id: tenant.id,
              name: tenant.name,
              status: tenant.status,
              verificationStatus: tenant.verificationStatus,
            },
          }
        : null
    }

    if (targetType === 'REVIEW') {
      const review = await this.prisma.review.findFirst({
        where: {
          id: targetId,
          status: 'APPROVED',
          isVisible: true,
          room: {
            deletedAt: null,
            status: 'AVAILABLE',
            marketplaceStatus: 'PUBLISHED',
            tenant: { deletedAt: null, status: 'ACTIVE' },
            property: { deletedAt: null, status: 'ACTIVE' },
          },
        },
        select: { id: true, tenantId: true, roomId: true, reviewerId: true, rating: true, content: true, status: true },
      })
      return review
        ? {
            targetTenantId: review.tenantId,
            ownerId: review.reviewerId,
            snapshot: {
              id: review.id,
              tenantId: review.tenantId,
              roomId: review.roomId,
              rating: review.rating,
              content: review.content,
              status: review.status,
            },
          }
        : null
    }

    const user = await this.prisma.user.findFirst({
      where: { id: targetId, deletedAt: null, status: 'ACTIVE' },
      select: { id: true, fullName: true, status: true },
    })
    return user
      ? {
          targetTenantId: null,
          ownerId: user.id,
          snapshot: { id: user.id, fullName: user.fullName, status: user.status },
        }
      : null
  }

  create(data: Prisma.ReportUncheckedCreateInput, actorId: number) {
    return this.prisma.$transaction(async (tx) => {
      const report = await tx.report.create({ data, select: reportSelect })
      await tx.auditLog.create({
        data: {
          tenantId: report.targetTenantId,
          actorId,
          action: 'CREATE_REPORT',
          entityType: 'REPORT',
          entityId: String(report.id),
          newValues: { targetType: report.targetType, targetId: report.targetId, status: report.status },
        },
      })
      return report
    })
  }

  update(id: number, input: UpdateInput) {
    const isClaim = input.status === 'REVIEWING'
    const isTerminal = ['RESOLVED', 'REJECTED'].includes(input.status)
    const now = new Date()
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.report.updateMany({
        where: {
          id,
          status: input.expectedStatus,
          ...(input.requireHandler ? { handledBy: input.actorId } : {}),
        },
        data: {
          status: input.status,
          ...(isClaim ? { handledBy: input.actorId, reviewingAt: now } : {}),
          ...(isTerminal ? { resolutionNote: input.resolutionNote, resolvedAt: now } : {}),
        },
      })
      if (result.count !== 1) return null

      const report = await tx.report.findUniqueOrThrow({ where: { id }, select: reportSelect })
      await tx.auditLog.create({
        data: {
          tenantId: report.targetTenantId,
          actorId: input.actorId,
          action: input.action,
          entityType: 'REPORT',
          entityId: String(id),
          oldValues: { status: input.expectedStatus },
          newValues: { status: report.status, resolutionNote: input.resolutionNote ?? null },
        },
      })
      return report
    })
  }
}
