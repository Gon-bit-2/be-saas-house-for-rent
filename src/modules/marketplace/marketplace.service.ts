import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import { NotificationEventsService } from '@src/modules/notifications/notification-events.service'
import type { Prisma } from 'generated/prisma/client'
import type {
  TCreateMarketplaceRentalRequestBodySchema,
  TCreateMarketplaceViewingAppointmentBodySchema,
  TListMarketplaceAmenitiesQuerySchema,
  TListMarketplaceRoomsQuerySchema,
} from './model/marketplace.model'
import { MarketplaceRepository } from './repositories/marketplace.repo'

type MarketplaceRoomRecord = NonNullable<Awaited<ReturnType<MarketplaceRepository['findById']>>>

/**
 * Service for public room discovery and tenant-side marketplace actions.
 */
@Injectable()
export class MarketplaceService {
  constructor(
    private readonly marketplaceRepository: MarketplaceRepository,
    private readonly notificationEventsService: NotificationEventsService,
  ) {}

  async listRooms(query: TListMarketplaceRoomsQuerySchema) {
    const { page, limit, skip } = normalizePagination(query)
    const where = this.buildPublicRoomWhere(query)

    if (query.lat && query.lng && query.radius) {
      const propertyIds = await this.marketplaceRepository.findPropertyIdsWithinRadius(
        query.lat,
        query.lng,
        query.radius,
      )
      where.propertyId = { in: propertyIds }
    }

    const [rooms, total] = await this.marketplaceRepository.findMany(where, skip, limit)
    return buildPaginatedResult(
      rooms.map((room) => this.toPublicRoom(room, false)),
      total,
      page,
      limit,
    )
  }

  async listAmenities(query: TListMarketplaceAmenitiesQuerySchema) {
    const { page, limit, skip } = normalizePagination(query)
    const where: Prisma.AmenityWhereInput = {
      ...(query.category ? { category: { contains: query.category, mode: 'insensitive' } } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { category: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }
    const [amenities, total] = await this.marketplaceRepository.findActiveAmenities(where, skip, limit)
    return buildPaginatedResult(amenities, total, page, limit)
  }

  async getRoomById(id: number) {
    const room = await this.getPublicRoomRecordOrThrow(id)
    return this.toPublicRoom(room, true)
  }

  async getSimilarRooms(id: number) {
    const targetRoom = await this.getPublicRoomRecordOrThrow(id)

    const propertyOr: Prisma.PropertyWhereInput[] = [{ id: targetRoom.propertyId }]
    if (targetRoom.property.wardCode) {
      propertyOr.push({ wardCode: targetRoom.property.wardCode })
    } else if (targetRoom.property.district) {
      propertyOr.push({ district: targetRoom.property.district })
    }

    const where: Prisma.RoomWhereInput = {
      id: { not: id },
      deletedAt: null,
      status: 'AVAILABLE',
      marketplaceStatus: 'PUBLISHED',
      tenant: { deletedAt: null, status: 'ACTIVE' },
      property: {
        deletedAt: null,
        status: 'ACTIVE',
        OR: propertyOr,
      },
      ...(targetRoom.basePrice ? {
        basePrice: {
          gte: Math.floor(targetRoom.basePrice.toNumber() * 0.7),
          lte: Math.ceil(targetRoom.basePrice.toNumber() * 1.3),
        }
      } : {})
    }

    const [rooms] = await this.marketplaceRepository.findMany(where, 0, 5)
    return rooms.map((room) => this.toPublicRoom(room, false))
  }

  async createRentalRequest(userId: number, roomId: number, body: TCreateMarketplaceRentalRequestBodySchema) {
    const room = await this.getPublicRoomRecordOrThrow(roomId)
    await this.assertRenterProfile(userId)
    this.assertDateNotInPast(body.expectedStartDate, 'Ngày dự kiến dọn vào không được ở quá khứ')

    const duplicateRequest = await this.marketplaceRepository.findActiveRentalRequest(userId, roomId)
    if (duplicateRequest) {
      throw new ConflictException('Bạn đã có yêu cầu thuê đang xử lý cho phòng này')
    }

    if (body.appointmentId) {
      const appointment = await this.marketplaceRepository.findAppointmentForRenterRoom(
        body.appointmentId,
        userId,
        roomId,
      )
      if (!appointment) {
        throw new BadRequestException('Lịch hẹn không hợp lệ cho phòng này')
      }
    }

    try {
      const request = await this.marketplaceRepository.createRentalRequest({
        tenantId: room.tenantId,
        roomId,
        renterId: userId,
        appointmentId: body.appointmentId ?? null,
        message: body.message ?? null,
        expectedStartDate: body.expectedStartDate,
        status: 'PENDING',
        createdById: userId,
      })
      await this.notificationEventsService.notifyRentalRequestCreated(request)
      return request
    } catch (error) {
      if (this.isConflict(error)) throw new ConflictException('Bạn đã có yêu cầu thuê đang xử lý cho phòng này')
      throw error
    }
  }

  async createViewingAppointment(userId: number, roomId: number, body: TCreateMarketplaceViewingAppointmentBodySchema) {
    const room = await this.getPublicRoomRecordOrThrow(roomId)
    await this.assertRenterProfile(userId)
    this.assertFutureDateTime(body.scheduledAt, 'Thời gian hẹn xem phòng phải ở tương lai')

    try {
      const appointment = await this.marketplaceRepository.createViewingAppointmentWithConflictCheck(
        {
          tenantId: room.tenantId,
          roomId,
          renterId: userId,
          scheduledAt: body.scheduledAt,
          note: body.note ?? null,
          status: 'PENDING',
          createdById: userId,
        },
        60,
      )
      await this.notificationEventsService.notifyViewingAppointmentCreated(appointment)
      return appointment
    } catch (error) {
      if (this.isConflict(error)) throw new ConflictException('Khung giờ xem phòng đã có lịch hẹn khác')
      throw error
    }
  }

  private async getPublicRoomRecordOrThrow(id: number) {
    const room = await this.marketplaceRepository.findById(id)
    if (!room) {
      throw new NotFoundException('Không tìm thấy phòng đang hiển thị trên marketplace')
    }
    return room
  }

  private toPublicRoom(room: MarketplaceRoomRecord, includeExactLocation: boolean) {
    const { tenantId, property, ...publicRoom } = room
    void tenantId
    if (includeExactLocation) return { ...publicRoom, property }
    const { addressDetail, latitude, longitude, ...publicProperty } = property
    void addressDetail
    void latitude
    void longitude
    return { ...publicRoom, property: publicProperty }
  }

  private async assertRenterProfile(userId: number) {
    const profile = await this.marketplaceRepository.findRenterProfile(userId)
    if (!profile) {
      throw new BadRequestException('Tài khoản chưa có hồ sơ người thuê')
    }
  }

  private assertDateNotInPast(date: Date, message: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const value = new Date(date)
    value.setHours(0, 0, 0, 0)
    if (value < today) {
      throw new BadRequestException(message)
    }
  }

  private assertFutureDateTime(date: Date, message: string) {
    if (date.getTime() <= Date.now()) {
      throw new BadRequestException(message)
    }
  }

  private isConflict(error: unknown) {
    return Boolean(
      error &&
      typeof error === 'object' &&
      (('code' in error && ['P2002', 'P2034'].includes(String(error.code))) ||
        ('message' in error && String(error.message) === 'APPOINTMENT_CONFLICT')),
    )
  }

  private buildPublicRoomWhere(query: TListMarketplaceRoomsQuerySchema): Prisma.RoomWhereInput {
    const amenityFilters = query.amenityIds?.map((amenityId) => ({ amenities: { some: { amenityId } } })) ?? []

    return {
      deletedAt: null,
      status: 'AVAILABLE',
      marketplaceStatus: 'PUBLISHED',
      tenant: {
        deletedAt: null,
        status: 'ACTIVE',
      },
      property: {
        deletedAt: null,
        status: 'ACTIVE',
        ...(query.propertyType ? { type: query.propertyType } : {}),
        ...(query.province ? { province: { contains: query.province, mode: 'insensitive' } } : {}),
        ...(query.provinceCode ? { provinceCode: query.provinceCode } : {}),
        ...(query.district ? { district: { contains: query.district, mode: 'insensitive' } } : {}),
        ...(query.ward ? { ward: { contains: query.ward, mode: 'insensitive' } } : {}),
        ...(query.wardCode ? { wardCode: query.wardCode } : {}),
      },
      ...(query.maxOccupants ? { maxOccupants: { gte: query.maxOccupants } } : {}),
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
              { title: { contains: query.search, mode: 'insensitive' } },
              { roomCode: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { property: { name: { contains: query.search, mode: 'insensitive' } } },
              { property: { addressDetail: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
      ...(amenityFilters.length > 0 ? { AND: amenityFilters } : {}),
    }
  }
}
