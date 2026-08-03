import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import { NotificationEventsService } from '@src/modules/notifications/notification-events.service'
import type { Prisma } from 'generated/prisma/client'
import type {
  TCreateMarketplaceRentalRequestBodySchema,
  TCreateMarketplaceViewingAppointmentBodySchema,
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
    const [rooms, total] = await this.marketplaceRepository.findMany(where, skip, limit)
    return buildPaginatedResult(
      rooms.map((room) => this.toPublicRoom(room)),
      total,
      page,
      limit,
    )
  }

  async getRoomById(id: number) {
    const room = await this.getPublicRoomRecordOrThrow(id)
    return this.toPublicRoom(room)
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

  private toPublicRoom(room: MarketplaceRoomRecord) {
    const { tenantId, property, ...publicRoom } = room
    const { addressDetail, latitude, longitude, ...publicProperty } = property
    void tenantId
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
        ...(query.district ? { district: { contains: query.district, mode: 'insensitive' } } : {}),
        ...(query.ward ? { ward: { contains: query.ward, mode: 'insensitive' } } : {}),
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
