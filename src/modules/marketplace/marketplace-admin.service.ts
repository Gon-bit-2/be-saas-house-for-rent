import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import { NotificationEventsService } from '@src/modules/notifications/notification-events.service'
import type { Prisma } from 'generated/prisma/client'
import type {
  TListAdminMarketplaceRoomsQuerySchema,
  TMarketplaceModerationHistoryQuerySchema,
  TUpdateAdminMarketplaceStatusBodySchema,
} from './model/marketplace-admin.model'
import { MarketplaceAdminRepository } from './repositories/marketplace-admin.repo'

@Injectable()
export class MarketplaceAdminService {
  constructor(
    private readonly repository: MarketplaceAdminRepository,
    private readonly notificationEventsService: NotificationEventsService,
  ) {}

  async list(query: TListAdminMarketplaceRoomsQuerySchema) {
    const { page, limit, skip } = normalizePagination(query)
    const [rooms, total] = await this.repository.findMany(this.buildWhere(query), skip, limit)
    return buildPaginatedResult(rooms, total, page, limit)
  }

  async getById(id: number) {
    const room = await this.repository.findById(id)
    if (!room) {
      throw new NotFoundException('Không tìm thấy phòng marketplace')
    }
    return room
  }

  async getHistory(id: number, query: TMarketplaceModerationHistoryQuerySchema) {
    await this.getById(id)
    const { page, limit, skip } = normalizePagination(query)
    const [items, total] = await this.repository.findHistory(id, skip, limit)
    return buildPaginatedResult(items, total, page, limit)
  }

  async updateStatus(actorId: number, id: number, body: TUpdateAdminMarketplaceStatusBodySchema) {
    const room = await this.getById(id)
    this.assertTransition(room.marketplaceStatus, body.marketplaceStatus)

    if (body.marketplaceStatus === 'PUBLISHED') {
      this.assertPublishEligibility(room)
    }

    const updated = await this.repository.update(id, {
      actorId,
      fromStatus: room.marketplaceStatus,
      toStatus: body.marketplaceStatus,
      reason: body.reason,
      requirePublishEligibility: body.marketplaceStatus === 'PUBLISHED',
    })

    if (!updated) {
      throw new ConflictException('Tin đăng đã thay đổi hoặc không còn đủ điều kiện kiểm duyệt')
    }
    await this.notificationEventsService.notifyMarketplaceModerated(updated)
    return updated
  }

  private assertTransition(current: string, next: string) {
    const allowed =
      (current === 'PENDING_REVIEW' && (next === 'PUBLISHED' || next === 'REJECTED')) ||
      (current === 'PUBLISHED' && next === 'HIDDEN')
    if (!allowed) {
      throw new BadRequestException(`Không thể chuyển trạng thái marketplace từ ${current} sang ${next}`)
    }
  }

  private assertPublishEligibility(room: Awaited<ReturnType<MarketplaceAdminRepository['findById']>>) {
    if (!room || room.status !== 'AVAILABLE') {
      throw new BadRequestException('Chỉ phòng đang trống mới được duyệt đăng marketplace')
    }
    if (
      room.property.status !== 'ACTIVE' ||
      room.property.deletedAt ||
      room.tenant.status !== 'ACTIVE' ||
      room.tenant.deletedAt
    ) {
      throw new BadRequestException('Nhà trọ hoặc tenant không còn hoạt động')
    }
    if (room.images.length === 0) {
      throw new BadRequestException('Phòng cần có ít nhất một hình ảnh trước khi duyệt')
    }
  }

  private buildWhere(query: TListAdminMarketplaceRoomsQuerySchema): Prisma.RoomWhereInput {
    return {
      deletedAt: null,
      ...(query.marketplaceStatus ? { marketplaceStatus: query.marketplaceStatus } : {}),
      ...(query.roomStatus ? { status: query.roomStatus } : {}),
      ...(query.tenantId ? { tenantId: query.tenantId } : {}),
      ...(query.from || query.to
        ? {
            updatedAt: {
              ...(query.from ? { gte: this.startOfUtcDay(query.from) } : {}),
              ...(query.to ? { lte: this.endOfUtcDay(query.to) } : {}),
            },
          }
        : {}),
      ...(query.province || query.district
        ? {
            property: {
              ...(query.province ? { province: { contains: query.province, mode: 'insensitive' } } : {}),
              ...(query.district ? { district: { contains: query.district, mode: 'insensitive' } } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { roomCode: { contains: query.search, mode: 'insensitive' } },
              { title: { contains: query.search, mode: 'insensitive' } },
              { property: { name: { contains: query.search, mode: 'insensitive' } } },
              { tenant: { name: { contains: query.search, mode: 'insensitive' } } },
              { tenant: { owner: { fullName: { contains: query.search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    }
  }

  private startOfUtcDay(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  }

  private endOfUtcDay(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999))
  }
}
