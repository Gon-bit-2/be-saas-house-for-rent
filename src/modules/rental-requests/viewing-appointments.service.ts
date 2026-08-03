import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
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
  constructor(
    private readonly rentalRequestsRepository: RentalRequestsRepository,
    private readonly tenantAccessService: TenantAccessService,
  ) {}

  async listForLandlord(userId: number, query: TListViewingAppointmentsQuerySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const { page, limit, skip } = normalizePagination(query)
    const where = this.buildTenantAppointmentWhere(tenant.tenantId, query)
    const [appointments, total] = await this.rentalRequestsRepository.findAppointmentsAndCount(where, skip, limit)
    return buildPaginatedResult(appointments, total, page, limit)
  }

  async updateStatus(userId: number, id: number, body: TUpdateViewingAppointmentStatusBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const appointment = await this.rentalRequestsRepository.findTenantAppointment(tenant.tenantId, id)
    if (!appointment) {
      throw new NotFoundException('Không tìm thấy lịch hẹn xem phòng')
    }

    if (body.status === 'RESCHEDULED' && !body.scheduledAt) {
      throw new BadRequestException('Cần cung cấp thời gian mới khi dời lịch hẹn')
    }
    if (body.scheduledAt && body.scheduledAt.getTime() <= Date.now()) {
      throw new BadRequestException('Thời gian hẹn xem phòng phải ở tương lai')
    }

    if (body.assignedStaffId) {
      const member = await this.rentalRequestsRepository.findActiveTenantMember(tenant.tenantId, body.assignedStaffId)
      if (!member) {
        throw new BadRequestException('Nhân viên được phân công không thuộc tenant hiện tại')
      }
    }

    return this.rentalRequestsRepository.updateAppointment(tenant.tenantId, id, {
      status: body.status,
      scheduledAt: body.scheduledAt,
      assignedStaffId: body.assignedStaffId === undefined ? undefined : (body.assignedStaffId ?? null),
      landlordNote: body.landlordNote === undefined ? undefined : (body.landlordNote ?? null),
      updatedById: userId,
    })
  }

  async listMine(userId: number, query: TListViewingAppointmentsQuerySchema) {
    const { page, limit, skip } = normalizePagination(query)
    const [appointments, total] = await this.rentalRequestsRepository.findMyAppointmentsAndCount(userId, skip, limit)
    return buildPaginatedResult(appointments, total, page, limit)
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
    return this.rentalRequestsRepository.cancelRenterAppointment(id, userId)
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
}
