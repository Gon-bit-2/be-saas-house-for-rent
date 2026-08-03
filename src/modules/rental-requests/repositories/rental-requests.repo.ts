import { Injectable } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import { Prisma, type AppointmentStatus } from 'generated/prisma/client'

export const rentalRequestSelect = {
  id: true,
  tenantId: true,
  roomId: true,
  renterId: true,
  appointmentId: true,
  message: true,
  expectedStartDate: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  renter: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      renterProfile: { select: { id: true, verificationStatus: true } },
    },
  },
  room: {
    select: {
      id: true,
      roomCode: true,
      title: true,
      status: true,
      marketplaceStatus: true,
      property: { select: { id: true, name: true } },
    },
  },
  appointment: {
    select: {
      id: true,
      scheduledAt: true,
      status: true,
    },
  },
} satisfies Prisma.RentalRequestSelect

export const viewingAppointmentSelect = {
  id: true,
  tenantId: true,
  roomId: true,
  renterId: true,
  assignedStaffId: true,
  scheduledAt: true,
  note: true,
  landlordNote: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  renter: { select: { id: true, fullName: true, email: true, phone: true } },
  assignedStaff: { select: { id: true, fullName: true, email: true, phone: true } },
  room: {
    select: {
      id: true,
      roomCode: true,
      title: true,
      property: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.RoomViewingAppointmentSelect

/**
 * Repository for tenant rental request and viewing appointment workflows.
 */
@Injectable()
export class RentalRequestsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findRequestsAndCount(where: Prisma.RentalRequestWhereInput, skip: number, take: number) {
    return this.prismaService.$transaction([
      this.prismaService.rentalRequest.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }],
        select: rentalRequestSelect,
      }),
      this.prismaService.rentalRequest.count({ where }),
    ])
  }

  async findTenantRequest(tenantId: number, id: number) {
    return this.prismaService.rentalRequest.findFirst({ where: { id, tenantId }, select: rentalRequestSelect })
  }

  async findRenterRequest(renterId: number, id: number) {
    return this.prismaService.rentalRequest.findFirst({ where: { id, renterId }, select: rentalRequestSelect })
  }

  async findMyRequestsAndCount(where: Prisma.RentalRequestWhereInput, skip: number, take: number) {
    return this.prismaService.$transaction([
      this.prismaService.rentalRequest.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }],
        select: rentalRequestSelect,
      }),
      this.prismaService.rentalRequest.count({ where }),
    ])
  }

  async findAppointmentForRenterRoom(appointmentId: number, renterId: number, roomId: number) {
    return this.prismaService.roomViewingAppointment.findFirst({
      where: { id: appointmentId, renterId, roomId, status: { in: ['CONFIRMED', 'COMPLETED'] } },
      select: { id: true },
    })
  }

  async updateRenterRequest(renterId: number, id: number, data: Prisma.RentalRequestUncheckedUpdateInput) {
    return this.prismaService.$transaction(async (tx) => {
      const updated = await tx.rentalRequest.updateMany({
        where: { id, renterId, status: 'NEED_MORE_INFO' },
        data: { ...data, status: 'PENDING' },
      })
      if (updated.count !== 1) throw new Error('RENTAL_REQUEST_TRANSITION_CONFLICT')
      return tx.rentalRequest.findUniqueOrThrow({ where: { id }, select: rentalRequestSelect })
    })
  }

  /**
   * Approves a rental request and reserves the room in the same transaction.
   */
  async approveRequestAndReserveRoom(tenantId: number, id: number, actorId: number) {
    return this.prismaService.$transaction(
      async (tx) => {
        const request = await tx.rentalRequest.findFirstOrThrow({
          where: { id, tenantId },
          select: { roomId: true },
        })
        const room = await tx.room.findFirstOrThrow({
          where: { id: request.roomId, tenantId },
          select: { marketplaceStatus: true },
        })
        const reserved = await tx.room.updateMany({
          where: { id: request.roomId, tenantId, status: 'AVAILABLE', deletedAt: null },
          data: { status: 'RESERVED', marketplaceStatus: 'HIDDEN', updatedById: actorId },
        })
        if (reserved.count !== 1) throw new Error('ROOM_RESERVATION_CONFLICT')
        const approved = await tx.rentalRequest.updateMany({
          where: { id, tenantId, status: { in: ['PENDING', 'NEED_MORE_INFO'] } },
          data: { status: 'APPROVED', updatedById: actorId },
        })
        if (approved.count !== 1) throw new Error('RENTAL_REQUEST_DECISION_CONFLICT')
        if (room.marketplaceStatus !== 'HIDDEN') {
          await tx.marketplaceModeration.create({
            data: {
              roomId: request.roomId,
              tenantId,
              actorId,
              fromStatus: room.marketplaceStatus,
              toStatus: 'HIDDEN',
              reason: 'AUTO_RENTAL_REQUEST_APPROVED',
            },
          })
        }

        return tx.rentalRequest.findUniqueOrThrow({ where: { id }, select: rentalRequestSelect })
      },
      { isolationLevel: 'Serializable' },
    )
  }

  async updateRequestStatus(
    tenantId: number,
    id: number,
    expectedStatus: 'PENDING' | 'NEED_MORE_INFO',
    status: 'REJECTED' | 'NEED_MORE_INFO',
    actorId: number,
  ) {
    return this.prismaService.$transaction(async (tx) => {
      const updated = await tx.rentalRequest.updateMany({
        where: { id, tenantId, status: expectedStatus },
        data: { status, updatedById: actorId },
      })
      if (updated.count !== 1) throw new Error('RENTAL_REQUEST_DECISION_CONFLICT')
      return tx.rentalRequest.findUniqueOrThrow({ where: { id }, select: rentalRequestSelect })
    })
  }

  async cancelRenterRequest(id: number, renterId: number) {
    return this.prismaService.$transaction(async (tx) => {
      const updated = await tx.rentalRequest.updateMany({
        where: { id, renterId, status: { in: ['PENDING', 'NEED_MORE_INFO'] } },
        data: { status: 'CANCELED', updatedById: renterId },
      })
      if (updated.count !== 1) throw new Error('RENTAL_REQUEST_TRANSITION_CONFLICT')
      return tx.rentalRequest.findUniqueOrThrow({ where: { id }, select: rentalRequestSelect })
    })
  }

  async findAppointmentsAndCount(where: Prisma.RoomViewingAppointmentWhereInput, skip: number, take: number) {
    return this.prismaService.$transaction([
      this.prismaService.roomViewingAppointment.findMany({
        where,
        skip,
        take,
        orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
        select: viewingAppointmentSelect,
      }),
      this.prismaService.roomViewingAppointment.count({ where }),
    ])
  }

  async findTenantAppointment(tenantId: number, id: number) {
    return this.prismaService.roomViewingAppointment.findFirst({
      where: { id, tenantId },
      select: viewingAppointmentSelect,
    })
  }

  async findRenterAppointment(renterId: number, id: number) {
    return this.prismaService.roomViewingAppointment.findFirst({
      where: { id, renterId },
      select: viewingAppointmentSelect,
    })
  }

  async findMyAppointmentsAndCount(where: Prisma.RoomViewingAppointmentWhereInput, skip: number, take: number) {
    return this.prismaService.$transaction([
      this.prismaService.roomViewingAppointment.findMany({
        where,
        skip,
        take,
        orderBy: [{ scheduledAt: 'desc' }],
        select: viewingAppointmentSelect,
      }),
      this.prismaService.roomViewingAppointment.count({ where }),
    ])
  }

  async findActiveTenantMember(tenantId: number, userId: number, roleIds?: string[]) {
    return this.prismaService.tenantMember.findFirst({
      where: { tenantId, userId, status: 'ACTIVE', ...(roleIds ? { roleId: { in: roleIds } } : {}) },
      select: { id: true },
    })
  }

  async updateAppointmentWithConflictCheck(
    tenantId: number,
    id: number,
    expectedStatus: AppointmentStatus,
    data: {
      status: AppointmentStatus
      scheduledAt?: Date
      assignedStaffId?: number | null
      landlordNote?: string | null
      updatedById: number
    },
    durationMinutes: number,
  ) {
    return this.prismaService.$transaction(
      async (tx) => {
        const appointment = await tx.roomViewingAppointment.findFirstOrThrow({
          where: { id, tenantId },
          select: { roomId: true, scheduledAt: true, assignedStaffId: true },
        })
        const scheduledAt = data.scheduledAt ?? appointment.scheduledAt
        const assignedStaffId = data.assignedStaffId === undefined ? appointment.assignedStaffId : data.assignedStaffId

        if (['PENDING', 'CONFIRMED', 'RESCHEDULED'].includes(data.status)) {
          await tx.$queryRaw(Prisma.sql`SELECT 1 FROM pg_advisory_xact_lock(41004, ${appointment.roomId})`)
          if (assignedStaffId) {
            await tx.$queryRaw(Prisma.sql`SELECT 1 FROM pg_advisory_xact_lock(41005, ${assignedStaffId})`)
          }

          const before = new Date(scheduledAt.getTime() - durationMinutes * 60_000)
          const after = new Date(scheduledAt.getTime() + durationMinutes * 60_000)
          const conflict = await tx.roomViewingAppointment.findFirst({
            where: {
              id: { not: id },
              tenantId,
              status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] },
              scheduledAt: { gt: before, lt: after },
              OR: [{ roomId: appointment.roomId }, ...(assignedStaffId ? [{ assignedStaffId }] : [])],
            },
            select: { id: true },
          })
          if (conflict) throw new Error('APPOINTMENT_CONFLICT')
        }

        const transitioned = await tx.roomViewingAppointment.updateMany({
          where: { id, tenantId, status: expectedStatus },
          data,
        })
        if (transitioned.count !== 1) throw new Error('APPOINTMENT_TRANSITION_CONFLICT')
        return tx.roomViewingAppointment.findUniqueOrThrow({ where: { id }, select: viewingAppointmentSelect })
      },
      { isolationLevel: 'Serializable' },
    )
  }

  async cancelRenterAppointment(id: number, renterId: number) {
    return this.prismaService.$transaction(async (tx) => {
      const updated = await tx.roomViewingAppointment.updateMany({
        where: { id, renterId, status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] } },
        data: { status: 'CANCELED', updatedById: renterId },
      })
      if (updated.count !== 1) throw new Error('APPOINTMENT_TRANSITION_CONFLICT')
      return tx.roomViewingAppointment.findUniqueOrThrow({ where: { id }, select: viewingAppointmentSelect })
    })
  }
}
