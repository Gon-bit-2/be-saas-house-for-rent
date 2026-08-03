import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import { NotificationEventsService } from '@src/modules/notifications/notification-events.service'
import { TenantAccessService } from '@src/shared/modules/services/tenant-access.service'
import type { Prisma } from 'generated/prisma/client'
import type {
  TCancelMyRentalRequestBodySchema,
  TDecideRentalRequestBodySchema,
  TListRentalRequestsQuerySchema,
  TUpdateMyRentalRequestBodySchema,
} from './model/rental-requests.model'
import { RentalRequestsRepository } from './repositories/rental-requests.repo'

/**
 * Service for landlord request decisions and renter-side request tracking.
 */
@Injectable()
export class RentalRequestsService {
  constructor(
    private readonly rentalRequestsRepository: RentalRequestsRepository,
    private readonly tenantAccessService: TenantAccessService,
    private readonly notificationEventsService: NotificationEventsService,
  ) {}

  async listForLandlord(userId: number, query: TListRentalRequestsQuerySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const { page, limit, skip } = normalizePagination(query)
    const where = this.buildTenantRequestWhere(tenant.tenantId, query)
    const [requests, total] = await this.rentalRequestsRepository.findRequestsAndCount(where, skip, limit)
    return buildPaginatedResult(requests, total, page, limit)
  }

  async getForLandlord(userId: number, id: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    return this.getTenantRequestOrThrow(tenant.tenantId, id)
  }

  async decide(userId: number, id: number, body: TDecideRentalRequestBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const request = await this.getTenantRequestOrThrow(tenant.tenantId, id)

    if (!['PENDING', 'NEED_MORE_INFO'].includes(request.status)) {
      throw new BadRequestException('Chỉ xử lý được yêu cầu đang chờ hoặc cần bổ sung thông tin')
    }
    if (request.status === body.status) {
      throw new BadRequestException('Yêu cầu thuê đã ở trạng thái này')
    }

    if (body.status === 'APPROVED') {
      if (request.room.status !== 'AVAILABLE') {
        throw new BadRequestException('Phòng không còn trống để duyệt yêu cầu thuê')
      }
      try {
        const updated = await this.rentalRequestsRepository.approveRequestAndReserveRoom(tenant.tenantId, id, userId)
        await this.notificationEventsService.notifyRentalRequestChanged(updated)
        await this.notificationEventsService.notifyMarketplaceModerated({
          id: updated.roomId,
          tenantId: updated.tenantId,
          roomCode: updated.room.roomCode,
          title: updated.room.title,
          marketplaceStatus: 'HIDDEN',
        })
        return updated
      } catch (error) {
        if (this.isDecisionConflict(error)) {
          throw new ConflictException('Phòng hoặc yêu cầu thuê đã được xử lý bởi thao tác khác')
        }
        throw error
      }
    }

    try {
      const updated = await this.rentalRequestsRepository.updateRequestStatus(
        tenant.tenantId,
        id,
        request.status as 'PENDING' | 'NEED_MORE_INFO',
        body.status,
        userId,
      )
      await this.notificationEventsService.notifyRentalRequestChanged(updated)
      return updated
    } catch (error) {
      if (this.isDecisionConflict(error)) throw new ConflictException('Yêu cầu thuê đã được xử lý bởi thao tác khác')
      throw error
    }
  }

  async listMine(userId: number, query: TListRentalRequestsQuerySchema) {
    const { page, limit, skip } = normalizePagination(query)
    const where = this.buildRenterRequestWhere(userId, query)
    const [requests, total] = await this.rentalRequestsRepository.findMyRequestsAndCount(where, skip, limit)
    return buildPaginatedResult(requests, total, page, limit)
  }

  async updateMine(userId: number, id: number, body: TUpdateMyRentalRequestBodySchema) {
    const request = await this.rentalRequestsRepository.findRenterRequest(userId, id)
    if (!request) throw new NotFoundException('Không tìm thấy yêu cầu thuê của bạn')
    if (request.status !== 'NEED_MORE_INFO') {
      throw new BadRequestException('Chỉ yêu cầu cần bổ sung thông tin mới được cập nhật')
    }
    if (body.expectedStartDate) this.assertDateNotInPast(body.expectedStartDate)
    if (body.appointmentId) {
      const appointment = await this.rentalRequestsRepository.findAppointmentForRenterRoom(
        body.appointmentId,
        userId,
        request.roomId,
      )
      if (!appointment) throw new BadRequestException('Lịch hẹn không hợp lệ cho phòng này')
    }
    try {
      const updated = await this.rentalRequestsRepository.updateRenterRequest(userId, id, {
        expectedStartDate: body.expectedStartDate,
        message: body.message === undefined ? undefined : (body.message ?? null),
        appointmentId: body.appointmentId === undefined ? undefined : (body.appointmentId ?? null),
        updatedById: userId,
      })
      await this.notificationEventsService.notifyRentalRequestCreated(updated)
      return updated
    } catch (error) {
      if (error instanceof Error && error.message === 'RENTAL_REQUEST_TRANSITION_CONFLICT') {
        throw new ConflictException('Yêu cầu thuê đã được xử lý bởi thao tác khác')
      }
      throw error
    }
  }

  async cancelMine(userId: number, id: number, _body: TCancelMyRentalRequestBodySchema) {
    void _body
    const request = await this.rentalRequestsRepository.findRenterRequest(userId, id)
    if (!request) {
      throw new NotFoundException('Không tìm thấy yêu cầu thuê của bạn')
    }
    if (!['PENDING', 'NEED_MORE_INFO'].includes(request.status)) {
      throw new BadRequestException('Chỉ có thể hủy yêu cầu đang chờ hoặc cần bổ sung thông tin')
    }
    try {
      const updated = await this.rentalRequestsRepository.cancelRenterRequest(id, userId)
      await this.notificationEventsService.notifyRentalRequestChanged(updated)
      return updated
    } catch (error) {
      if (error instanceof Error && error.message === 'RENTAL_REQUEST_TRANSITION_CONFLICT') {
        throw new ConflictException('Yêu cầu thuê đã được xử lý bởi thao tác khác')
      }
      throw error
    }
  }

  private async getTenantRequestOrThrow(tenantId: number, id: number) {
    const request = await this.rentalRequestsRepository.findTenantRequest(tenantId, id)
    if (!request) {
      throw new NotFoundException('Không tìm thấy yêu cầu thuê')
    }
    return request
  }

  private isDecisionConflict(error: unknown) {
    if (
      error instanceof Error &&
      ['ROOM_RESERVATION_CONFLICT', 'RENTAL_REQUEST_DECISION_CONFLICT'].includes(error.message)
    ) {
      return true
    }
    return Boolean(error && typeof error === 'object' && 'code' in error && String(error.code) === 'P2034')
  }

  private buildTenantRequestWhere(
    tenantId: number,
    query: TListRentalRequestsQuerySchema,
  ): Prisma.RentalRequestWhereInput {
    return {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.roomId ? { roomId: query.roomId } : {}),
      ...(query.propertyId ? { room: { propertyId: query.propertyId } } : {}),
      ...(query.search
        ? {
            OR: [
              { renter: { fullName: { contains: query.search, mode: 'insensitive' } } },
              { renter: { email: { contains: query.search, mode: 'insensitive' } } },
              { renter: { phone: { contains: query.search, mode: 'insensitive' } } },
              { room: { roomCode: { contains: query.search, mode: 'insensitive' } } },
              { room: { title: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }
  }

  private buildRenterRequestWhere(
    userId: number,
    query: TListRentalRequestsQuerySchema,
  ): Prisma.RentalRequestWhereInput {
    return {
      renterId: userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.roomId ? { roomId: query.roomId } : {}),
      ...(query.propertyId ? { room: { propertyId: query.propertyId } } : {}),
      ...(query.search
        ? {
            OR: [
              { room: { roomCode: { contains: query.search, mode: 'insensitive' } } },
              { room: { title: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }
  }

  private assertDateNotInPast(date: Date) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const value = new Date(date)
    value.setHours(0, 0, 0, 0)
    if (value < today) throw new BadRequestException('Ngày dự kiến dọn vào không được ở quá khứ')
  }
}
