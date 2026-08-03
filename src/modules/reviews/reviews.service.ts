import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import roleName from '@src/common/constants/role.constant'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import { NotificationEventsService } from '@src/modules/notifications/notification-events.service'
import type { Prisma, ReviewStatus } from 'generated/prisma/client'
import type {
  TCreateReviewBody,
  TListAdminReviewsQuery,
  TListMyReviewsQuery,
  TListPublicReviewsQuery,
  TUpdateReviewStatusBody,
} from './model/reviews.model'
import { ReviewsRepository } from './repositories/reviews.repo'

const ELIGIBLE_CONTRACT_STATUSES = ['ACTIVE', 'EXPIRED', 'TERMINATED']

type ReviewRecord = NonNullable<Awaited<ReturnType<ReviewsRepository['findById']>>>

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name)

  constructor(
    private readonly repository: ReviewsRepository,
    private readonly notifications: NotificationEventsService,
  ) {}

  async create(userId: number, userRole: string, body: TCreateReviewBody) {
    this.assertRenter(userRole)
    const contract = await this.repository.findContract(userId, body.contractId)
    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng của bạn')
    if (!ELIGIBLE_CONTRACT_STATUSES.includes(contract.status) || contract.startDate.getTime() > Date.now()) {
      throw new ConflictException('Hợp đồng chưa đủ điều kiện để đánh giá')
    }

    try {
      return await this.repository.create(
        {
          tenantId: contract.tenantId,
          roomId: contract.roomId,
          contractId: contract.id,
          reviewerId: userId,
          rating: body.rating,
          content: body.content,
          cleanlinessScore: body.cleanlinessScore,
          locationScore: body.locationScore,
          priceScore: body.priceScore,
          serviceScore: body.serviceScore,
          status: 'PENDING',
          isVisible: false,
        },
        userId,
      )
    } catch (error) {
      if (this.isUniqueConflict(error)) throw new ConflictException('Bạn đã đánh giá hợp đồng này')
      throw error
    }
  }

  async listMine(userId: number, query: TListMyReviewsQuery) {
    const { page, limit, skip } = normalizePagination(query)
    const where: Prisma.ReviewWhereInput = {
      reviewerId: userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.roomId ? { roomId: query.roomId } : {}),
    }
    const [items, total] = await this.repository.findMany(where, skip, limit)
    return buildPaginatedResult(
      items.map((item) => this.toOwnerReview(item)),
      total,
      page,
      limit,
    )
  }

  async getMine(userId: number, id: number) {
    const review = await this.repository.findById(id)
    if (!review || review.reviewerId !== userId) throw new NotFoundException('Không tìm thấy đánh giá của bạn')
    return this.toOwnerReview(review)
  }

  async listPublic(roomId: number, query: TListPublicReviewsQuery) {
    await this.assertPublicRoom(roomId)
    const { page, limit, skip } = normalizePagination(query)
    const [items, total] = await this.repository.findMany({ roomId, status: 'APPROVED', isVisible: true }, skip, limit)
    return buildPaginatedResult(
      items.map((item) => this.toPublicReview(item)),
      total,
      page,
      limit,
    )
  }

  async getSummary(roomId: number) {
    await this.assertPublicRoom(roomId)
    const [aggregate, groups] = await this.repository.getSummary(roomId)
    const distribution: Record<'1' | '2' | '3' | '4' | '5', number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
    for (const group of groups) {
      const count = typeof group._count === 'object' ? (group._count._all ?? 0) : 0
      distribution[String(group.rating) as keyof typeof distribution] = count
    }
    return {
      totalReviews: aggregate._count._all,
      averageRating: aggregate._avg.rating,
      averageCleanlinessScore: aggregate._avg.cleanlinessScore,
      averageLocationScore: aggregate._avg.locationScore,
      averagePriceScore: aggregate._avg.priceScore,
      averageServiceScore: aggregate._avg.serviceScore,
      distribution,
    }
  }

  async list(query: TListAdminReviewsQuery) {
    const { page, limit, skip } = normalizePagination(query)
    const [items, total] = await this.repository.findMany(this.buildAdminWhere(query), skip, limit)
    return buildPaginatedResult(items, total, page, limit)
  }

  async getById(id: number) {
    const review = await this.repository.findById(id)
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá')
    return review
  }

  async updateStatus(actorId: number, id: number, body: TUpdateReviewStatusBody) {
    const review = await this.getById(id)
    this.assertTransition(review.status, body.status)
    const updated = await this.repository.update(id, {
      actorId,
      expectedStatus: review.status,
      status: body.status,
      isVisible: body.status === 'APPROVED',
      reason: body.reason,
      action: `${body.status === 'APPROVED' && review.status === 'HIDDEN' ? 'RESTORE' : body.status}_REVIEW`,
    })
    if (!updated) throw new ConflictException('Đánh giá đã được xử lý bởi thao tác khác')
    await this.notify(() => this.notifications.notifyReviewUpdated(updated))
    return updated
  }

  private assertRenter(role: string) {
    if (role !== roleName.TENANT) throw new ForbiddenException('Chỉ người thuê được gửi đánh giá')
  }

  private async assertPublicRoom(roomId: number) {
    if (!(await this.repository.findRoom(roomId))) {
      throw new NotFoundException('Không tìm thấy phòng đang hiển thị trên marketplace')
    }
  }

  private assertTransition(current: ReviewStatus, next: ReviewStatus) {
    const allowed =
      (current === 'PENDING' && ['APPROVED', 'REJECTED'].includes(next)) ||
      (current === 'APPROVED' && next === 'HIDDEN') ||
      (current === 'HIDDEN' && next === 'APPROVED')
    if (!allowed) throw new ConflictException(`Không thể chuyển đánh giá từ ${current} sang ${next}`)
  }

  private buildAdminWhere(query: TListAdminReviewsQuery): Prisma.ReviewWhereInput {
    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.tenantId ? { tenantId: query.tenantId } : {}),
      ...(query.roomId ? { roomId: query.roomId } : {}),
      ...(query.reviewerId ? { reviewerId: query.reviewerId } : {}),
      ...(query.from || query.to
        ? { createdAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { content: { contains: query.search, mode: 'insensitive' } },
              { room: { title: { contains: query.search, mode: 'insensitive' } } },
              { reviewer: { fullName: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }
  }

  private toOwnerReview(review: ReviewRecord) {
    return {
      id: review.id,
      room: review.room,
      contract: review.contract,
      rating: review.rating,
      content: review.content,
      cleanlinessScore: review.cleanlinessScore,
      locationScore: review.locationScore,
      priceScore: review.priceScore,
      serviceScore: review.serviceScore,
      status: review.status,
      moderationReason: review.moderationReason,
      moderatedAt: review.moderatedAt,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    }
  }
  private toPublicReview(review: ReviewRecord) {
    return {
      id: review.id,
      rating: review.rating,
      content: review.content,
      cleanlinessScore: review.cleanlinessScore,
      locationScore: review.locationScore,
      priceScore: review.priceScore,
      serviceScore: review.serviceScore,
      createdAt: review.createdAt,
      reviewer: 'Người thuê đã xác thực',
      verifiedStay: true,
    }
  }

  private isUniqueConflict(error: unknown) {
    return Boolean(error && typeof error === 'object' && 'code' in error && String(error.code) === 'P2002')
  }

  private async notify(action: () => Promise<unknown>) {
    try {
      await action()
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Không thể gửi thông báo đánh giá')
    }
  }
}
