import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import { NotificationEventsService } from '@src/modules/notifications/notification-events.service'
import { TenantAccessService } from '@src/shared/modules/services/tenant-access.service'
import type { Prisma } from 'generated/prisma/client'
import type {
  TCreateRoomBodySchema,
  TListRoomsQuerySchema,
  TReplaceRoomAmenitiesBodySchema,
  TUpdateRoomBodySchema,
  TUpdateRoomMarketplaceBodySchema,
  TUpdateRoomStatusBodySchema,
} from './model/rooms.model'
import { RoomsRepository } from './repositories/rooms.repo'

/**
 * Service containing tenant-scoped business rules for room management.
 */
@Injectable()
export class RoomsService {
  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly tenantAccessService: TenantAccessService,
    private readonly notificationEventsService: NotificationEventsService,
  ) {}

  async list(userId: number, query: TListRoomsQuerySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const { page, limit, skip } = normalizePagination(query)
    const where = this.buildListWhere(tenant.tenantId, query)
    const [rooms, total] = await this.roomsRepository.findMany(where, skip, limit)
    return buildPaginatedResult(rooms, total, page, limit)
  }

  async getById(userId: number, id: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    return this.getTenantRoomOrThrow(tenant.tenantId, id)
  }

  async create(userId: number, body: TCreateRoomBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    await this.assertPropertyForTenant(tenant.tenantId, body.propertyId)
    await this.assertFloorForProperty(tenant.tenantId, body.propertyId, body.floorId)
    await this.assertRoomCodeAvailable(body.propertyId, body.roomCode)
    const amenityIds = await this.assertActiveAmenities(body.amenityIds)

    return this.roomsRepository.create(
      {
        tenantId: tenant.tenantId,
        propertyId: body.propertyId,
        floorId: body.floorId ?? null,
        roomCode: body.roomCode,
        title: body.title,
        area: body.area,
        maxOccupants: body.maxOccupants,
        basePrice: body.basePrice,
        depositAmount: body.depositAmount,
        electricityPrice: body.electricityPrice,
        waterPrice: body.waterPrice,
        description: body.description ?? null,
        status: body.status,
        marketplaceStatus: 'DRAFT',
        createdById: userId,
      },
      amenityIds,
    )
  }

  async update(userId: number, id: number, body: TUpdateRoomBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const room = await this.getTenantRoomOrThrow(tenant.tenantId, id)

    if (body.floorId !== undefined) {
      await this.assertFloorForProperty(tenant.tenantId, room.propertyId, body.floorId)
    }

    if (body.roomCode && body.roomCode !== room.roomCode) {
      await this.assertRoomCodeAvailable(room.propertyId, body.roomCode, id)
    }

    return this.roomsRepository.update(id, {
      ...body,
      floorId: body.floorId === undefined ? undefined : (body.floorId ?? null),
      description: body.description === undefined ? undefined : (body.description ?? null),
      updatedById: userId,
    })
  }

  async updateStatus(userId: number, id: number, body: TUpdateRoomStatusBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const room = await this.getTenantRoomOrThrow(tenant.tenantId, id)
    const updated = await this.roomsRepository.updateStatus(id, body.status, userId, room.marketplaceStatus)
    if (room.marketplaceStatus === 'PUBLISHED' && updated.marketplaceStatus === 'HIDDEN') {
      await this.notificationEventsService.notifyMarketplaceModerated(updated)
    }
    return updated
  }

  async updateMarketplace(userId: number, id: number, body: TUpdateRoomMarketplaceBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const room = await this.getTenantRoomOrThrow(tenant.tenantId, id)

    this.assertLandlordMarketplaceTransition(room.marketplaceStatus, body.marketplaceStatus)

    if (body.marketplaceStatus === 'PENDING_REVIEW') {
      if (room.status !== 'AVAILABLE') {
        throw new BadRequestException('Chỉ phòng đang trống mới được gửi duyệt marketplace')
      }
      if (room.property.status !== 'ACTIVE') {
        throw new BadRequestException('Chỉ nhà trọ đang hoạt động mới được gửi duyệt phòng')
      }
      if (room.images.length === 0) {
        throw new BadRequestException('Phòng cần có ít nhất một hình ảnh trước khi gửi duyệt')
      }
    }

    const updated = await this.roomsRepository.updateMarketplace(
      id,
      userId,
      room.marketplaceStatus,
      body.marketplaceStatus,
    )
    if (!updated) {
      throw new ConflictException('Trạng thái marketplace đã thay đổi, vui lòng tải lại dữ liệu')
    }
    if (updated.marketplaceStatus === 'PENDING_REVIEW') {
      await this.notificationEventsService.notifyMarketplaceSubmitted(updated)
    } else if (updated.marketplaceStatus === 'HIDDEN') {
      await this.notificationEventsService.notifyMarketplaceModerated(updated)
    }
    return updated
  }

  async replaceAmenities(userId: number, id: number, body: TReplaceRoomAmenitiesBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    await this.getTenantRoomOrThrow(tenant.tenantId, id)
    const amenityIds = await this.assertActiveAmenities(body.amenityIds)
    return this.roomsRepository.replaceRoomAmenities(id, amenityIds)
  }

  async softDelete(userId: number, id: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const room = await this.getTenantRoomOrThrow(tenant.tenantId, id)
    if (room.status === 'OCCUPIED' || room.status === 'RESERVED') {
      throw new BadRequestException('Không thể xóa phòng đang thuê hoặc đã đặt cọc')
    }
    return this.roomsRepository.softDelete(tenant.tenantId, id, userId, room.marketplaceStatus)
  }

  private async getTenantRoomOrThrow(tenantId: number, id: number) {
    const room = await this.roomsRepository.findById(tenantId, id)
    if (!room) {
      throw new NotFoundException('Không tìm thấy phòng')
    }
    return room
  }

  private async assertPropertyForTenant(tenantId: number, propertyId: number) {
    const property = await this.roomsRepository.findPropertyForRoom(tenantId, propertyId)
    if (!property) {
      throw new NotFoundException('Không tìm thấy nhà trọ')
    }
    return property
  }

  private async assertFloorForProperty(tenantId: number, propertyId: number, floorId?: number | null) {
    if (!floorId) {
      return
    }
    const floor = await this.roomsRepository.findFloorForProperty(tenantId, propertyId, floorId)
    if (!floor) {
      throw new NotFoundException('Không tìm thấy tầng thuộc nhà trọ này')
    }
  }

  private async assertRoomCodeAvailable(propertyId: number, roomCode: string, excludedRoomId?: number) {
    const existingRoom = await this.roomsRepository.findRoomByPropertyCode(propertyId, roomCode, excludedRoomId)
    if (existingRoom) {
      throw new ConflictException('Mã phòng đã tồn tại trong nhà trọ này')
    }
  }

  private async assertActiveAmenities(amenityIds: number[]) {
    const uniqueIds = Array.from(new Set(amenityIds))
    const activeCount = await this.roomsRepository.countActiveAmenities(uniqueIds)
    if (activeCount !== uniqueIds.length) {
      throw new BadRequestException('Danh sách tiện ích chứa tiện ích không tồn tại hoặc đã bị tắt')
    }
    return uniqueIds
  }

  private assertLandlordMarketplaceTransition(current: string, next: string) {
    const canSubmit = ['DRAFT', 'REJECTED', 'HIDDEN'].includes(current) && next === 'PENDING_REVIEW'
    const canWithdraw = current === 'PENDING_REVIEW' && next === 'DRAFT'
    const canHide = current === 'PUBLISHED' && next === 'HIDDEN'
    if (!canSubmit && !canWithdraw && !canHide) {
      throw new BadRequestException(`Không thể chuyển trạng thái marketplace từ ${current} sang ${next}`)
    }
  }

  private buildListWhere(tenantId: number, query: TListRoomsQuerySchema): Prisma.RoomWhereInput {
    return {
      tenantId,
      deletedAt: null,
      ...(query.propertyId ? { propertyId: query.propertyId } : {}),
      ...(query.floorId ? { floorId: query.floorId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.marketplaceStatus ? { marketplaceStatus: query.marketplaceStatus } : {}),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined
        ? {
            basePrice: {
              ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
              ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
            },
          }
        : {}),
      ...(query.minArea !== undefined || query.maxArea !== undefined
        ? {
            area: {
              ...(query.minArea !== undefined ? { gte: query.minArea } : {}),
              ...(query.maxArea !== undefined ? { lte: query.maxArea } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { roomCode: { contains: query.search, mode: 'insensitive' } },
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { property: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }
  }
}
