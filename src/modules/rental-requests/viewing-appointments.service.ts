import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import { NotificationEventsService } from '@src/modules/notifications/notification-events.service'
import { TenantAccessService } from '@src/shared/modules/services/tenant-access.service'
import type { Prisma } from 'generated/prisma/client'
import type {
  TCancelMyViewingAppointmentBodySchema,
  TListViewingAppointmentsQuerySchema,
  TUpdateViewingAppointmentStatusBodySchema,
} from './model/rental-requests.model'
import { RentalRequestsRepository } from './repositories/rental-requests.repo'

/**
 * Service for landlord and renter viewing appointment workflows.
 */
@Injectable()
export class ViewingAppointmentsService {
  private static readonly TRANSITIONS: Record<string, readonly string[]> = {
    PENDING: ['CONFIRMED', 'RESCHEDULED', 'REJECTED', 'CANCELED'],
    RESCHEDULED: ['CONFIRMED', 'RESCHEDULED', 'REJECTED', 'CANCELED'],
    CONFIRMED: ['RESCHEDULED', 'COMPLETED', 'CANCELED'],
  }
  constructor(
    private readonly rentalRequestsRepository: RentalRequestsRepository,
    private readonly tenantAccessService: TenantAccessService,
    private readonly notificationEventsService: NotificationEventsService,
  ) {}

  async listForLandlord(userId: number, query: TListViewingAppointmentsQuerySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const { page, limit, skip } = normalizePagination(query)
    const where = this.buildTenantAppointmentWhere(tenant.tenantId, query)
    const [appointments, total] = await this.rentalRequestsRepository.findAppointmentsAndCount(where, skip, limit)
    return buildPaginatedResult(appointments, total, page, limit)
  }

  async getForLandlord(userId: number, id: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const appointment = await this.rentalRequestsRepository.findTenantAppointment(tenant.tenantId, id)
    if (!appointment) {
      throw new NotFoundException('Không tìm thấy lịch hẹn xem phòng')
    }
    return appointment
  }

  async updateStatus(userId: number, id: number, body: TUpdateViewingAppointmentStatusBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const appointment = await this.rentalRequestsRepository.findTenantAppointment(tenant.tenantId, id)
    if (!appointment) {
      throw new NotFoundException('Không tìm thấy lịch hẹn xem phòng')
    }

    if (!ViewingAppointmentsService.TRANSITIONS[appointment.status]?.includes(body.status)) {
      throw new BadRequestException(`Không thể chuyển lịch hẹn từ ${appointment.status} sang ${body.status}`)
    }

    if (body.status === 'RESCHEDULED' && !body.scheduledAt) {
      throw new BadRequestException('Cần cung cấp thời gian mới khi dời lịch hẹn')
    }
    if (body.status !== 'RESCHEDULED' && body.scheduledAt) {
      throw new BadRequestException('Chỉ được gửi scheduledAt khi dời lịch hẹn')
    }
    if (body.scheduledAt && body.scheduledAt.getTime() <= Date.now()) {
      throw new BadRequestException('Thời gian hẹn xem phòng phải ở tương lai')
    }

    if (body.assignedStaffId) {
      const member = await this.rentalRequestsRepository.findActiveTenantMember(tenant.tenantId, body.assignedStaffId, [
        'LANDLORD',
        'MANAGER',
        'MAINTENANCE_STAFF',
      ])
      if (!member) {
        throw new BadRequestException('Nhân viên được phân công không thuộc tenant hiện tại')
      }
    }

    try {
      const updated = await this.rentalRequestsRepository.updateAppointmentWithConflictCheck(
        tenant.tenantId,
        id,
        appointment.status,
        {
          status: body.status,
          scheduledAt: body.scheduledAt,
          assignedStaffId: body.assignedStaffId === undefined ? undefined : (body.assignedStaffId ?? null),
          landlordNote: body.landlordNote === undefined ? undefined : (body.landlordNote ?? null),
          updatedById: userId,
        },
        60,
      )
      await this.notificationEventsService.notifyViewingAppointmentChanged(updated)
      return updated
    } catch (error) {
      if (
        error instanceof Error &&
        ['APPOINTMENT_CONFLICT', 'APPOINTMENT_TRANSITION_CONFLICT'].includes(error.message)
      ) {
        throw new ConflictException('Lịch xem phòng hoặc nhân viên đã bị trùng với lịch khác')
      }
      throw error
    }
  }

  async listMine(userId: number, query: TListViewingAppointmentsQuerySchema) {
    const { page, limit, skip } = normalizePagination(query)
    const where = this.buildRenterAppointmentWhere(userId, query)
    const [appointments, total] = await this.rentalRequestsRepository.findMyAppointmentsAndCount(where, skip, limit)
    return buildPaginatedResult(appointments, total, page, limit)
  }

  async getMine(userId: number, id: number) {
    const appointment = await this.rentalRequestsRepository.findRenterAppointment(userId, id)
    if (!appointment) {
      throw new NotFoundException('Không tìm thấy lịch hẹn của bạn')
    }
    return appointment
  }

  async cancelMine(userId: number, id: number, _body: TCancelMyViewingAppointmentBodySchema) {
    void _body
    const appointment = await this.rentalRequestsRepository.findRenterAppointment(userId, id)
    if (!appointment) {
      throw new NotFoundException('Không tìm thấy lịch hẹn của bạn')
    }
    if (['REJECTED', 'CANCELED', 'COMPLETED'].includes(appointment.status)) {
      throw new BadRequestException('Không thể hủy lịch hẹn ở trạng thái hiện tại')
    }
    try {
      const updated = await this.rentalRequestsRepository.cancelRenterAppointment(id, userId)
      await this.notificationEventsService.notifyViewingAppointmentChanged(updated)
      return updated
    } catch (error) {
      if (error instanceof Error && error.message === 'APPOINTMENT_TRANSITION_CONFLICT') {
        throw new ConflictException('Lịch hẹn đã được xử lý bởi thao tác khác')
      }
      throw error
    }
  }

  private buildTenantAppointmentWhere(
    tenantId: number,
    query: TListViewingAppointmentsQuerySchema,
  ): Prisma.RoomViewingAppointmentWhereInput {
    return {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.roomId ? { roomId: query.roomId } : {}),
      ...(query.propertyId ? { room: { propertyId: query.propertyId } } : {}),
      ...(query.from || query.to
        ? { scheduledAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
        : {}),
    }
  }

  private buildRenterAppointmentWhere(
    userId: number,
    query: TListViewingAppointmentsQuerySchema,
  ): Prisma.RoomViewingAppointmentWhereInput {
    return {
      renterId: userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.roomId ? { roomId: query.roomId } : {}),
      ...(query.propertyId ? { room: { propertyId: query.propertyId } } : {}),
      ...(query.from || query.to
        ? { scheduledAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
        : {}),
    }
  }
}
