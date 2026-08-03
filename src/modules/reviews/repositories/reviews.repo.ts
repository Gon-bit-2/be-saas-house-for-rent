import { Injectable } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import type { Prisma, ReviewStatus } from 'generated/prisma/client'

export const reviewSelect = {
  id: true,
  tenantId: true,
  roomId: true,
  contractId: true,
  reviewerId: true,
  rating: true,
  content: true,
  cleanlinessScore: true,
  locationScore: true,
  priceScore: true,
  serviceScore: true,
  isVisible: true,
  status: true,
  moderatedById: true,
  moderationReason: true,
  moderatedAt: true,
  createdAt: true,
  updatedAt: true,
  room: { select: { id: true, roomCode: true, title: true, marketplaceStatus: true } },
  contract: { select: { id: true, contractCode: true, status: true, startDate: true, endDate: true } },
  reviewer: { select: { id: true, fullName: true, email: true, phone: true } },
  moderator: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.ReviewSelect

type UpdateInput = {
  actorId: number
  expectedStatus: ReviewStatus
  status: ReviewStatus
  isVisible: boolean
  reason?: string
  action: string
}

@Injectable()
export class ReviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(where: Prisma.ReviewWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: reviewSelect,
      }),
      this.prisma.review.count({ where }),
    ])
  }

  findById(id: number) {
    return this.prisma.review.findUnique({ where: { id }, select: reviewSelect })
  }

  findRoom(roomId: number) {
    return this.prisma.room.findFirst({
      where: {
        id: roomId,
        deletedAt: null,
        status: 'AVAILABLE',
        marketplaceStatus: 'PUBLISHED',
        tenant: { deletedAt: null, status: 'ACTIVE' },
        property: { deletedAt: null, status: 'ACTIVE' },
      },
      select: { id: true },
    })
  }

  findContract(userId: number, contractId: number) {
    return this.prisma.contract.findFirst({
      where: {
        id: contractId,
        deletedAt: null,
        OR: [{ renterId: userId }, { members: { some: { userId } } }],
      },
      select: { id: true, tenantId: true, roomId: true, status: true, startDate: true },
    })
  }

  create(data: Prisma.ReviewUncheckedCreateInput, actorId: number) {
    return this.prisma.$transaction(async (tx) => {
      const review = await tx.review.create({ data, select: reviewSelect })
      await tx.auditLog.create({
        data: {
          tenantId: review.tenantId,
          actorId,
          action: 'CREATE_REVIEW',
          entityType: 'REVIEW',
          entityId: String(review.id),
          newValues: { contractId: review.contractId, roomId: review.roomId, status: review.status },
        },
      })
      return review
    })
  }

  update(id: number, input: UpdateInput) {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.review.updateMany({
        where: { id, status: input.expectedStatus },
        data: {
          status: input.status,
          isVisible: input.isVisible,
          moderatedById: input.actorId,
          moderatedAt: new Date(),
          moderationReason: input.reason ?? null,
        },
      })
      if (result.count !== 1) return null

      const review = await tx.review.findUniqueOrThrow({ where: { id }, select: reviewSelect })
      await tx.auditLog.create({
        data: {
          tenantId: review.tenantId,
          actorId: input.actorId,
          action: input.action,
          entityType: 'REVIEW',
          entityId: String(id),
          oldValues: { status: input.expectedStatus },
          newValues: { status: review.status, isVisible: review.isVisible, reason: input.reason ?? null },
        },
      })
      return review
    })
  }

  getSummary(roomId: number) {
    const where: Prisma.ReviewWhereInput = { roomId, status: 'APPROVED', isVisible: true }
    return this.prisma.$transaction([
      this.prisma.review.aggregate({
        where,
        _count: { _all: true },
        _avg: {
          rating: true,
          cleanlinessScore: true,
          locationScore: true,
          priceScore: true,
          serviceScore: true,
        },
      }),
      this.prisma.review.groupBy({ by: ['rating'], where, _count: { _all: true }, orderBy: { rating: 'asc' } }),
    ])
  }
}
