import { Injectable } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import type { Prisma } from 'generated/prisma/client'

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

  async findMyRequestsAndCount(renterId: number, skip: number, take: number) {
    return this.prismaService.$transaction([
      this.prismaService.rentalRequest.findMany({
        where: { renterId },
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }],
        select: rentalRequestSelect,
      }),
      this.prismaService.rentalRequest.count({ where: { renterId } }),
    ])
  }

  /**
   * Approves a rental request and reserves the room in the same transaction.
   */
  async approveRequestAndReserveRoom(tenantId: number, id: number, actorId: number) {
    return this.prismaService.$transaction(async (tx) => {
      await tx.rentalRequest.update({
        where: { id, tenantId },
        data: { status: 'APPROVED', updatedById: actorId },
      })

      const request = await tx.rentalRequest.findUniqueOrThrow({ where: { id }, select: { roomId: true } })
      const room = await tx.room.findUniqueOrThrow({
        where: { id: request.roomId },
        select: { marketplaceStatus: true },
      })
      await tx.room.update({
        where: { id: request.roomId, tenantId },
        data: { status: 'RESERVED', marketplaceStatus: 'HIDDEN', updatedById: actorId },
      })
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
    })
  }

  async updateRequestStatus(tenantId: number, id: number, status: 'REJECTED' | 'NEED_MORE_INFO', actorId: number) {
    return this.prismaService.rentalRequest.update({
      where: { id, tenantId },
      data: { status, updatedById: actorId },
      select: rentalRequestSelect,
    })
  }

  async cancelRenterRequest(id: number, renterId: number) {
    return this.prismaService.rentalRequest.update({
      where: { id, renterId },
      data: { status: 'CANCELED', updatedById: renterId },
      select: rentalRequestSelect,
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

  async findMyAppointmentsAndCount(renterId: number, skip: number, take: number) {
    return this.prismaService.$transaction([
      this.prismaService.roomViewingAppointment.findMany({
        where: { renterId },
        skip,
        take,
        orderBy: [{ scheduledAt: 'desc' }],
        select: viewingAppointmentSelect,
      }),
      this.prismaService.roomViewingAppointment.count({ where: { renterId } }),
    ])
  }

  async findActiveTenantMember(tenantId: number, userId: number) {
    return this.prismaService.tenantMember.findFirst({
      where: { tenantId, userId, status: 'ACTIVE' },
      select: { id: true },
    })
  }

  async updateAppointment(tenantId: number, id: number, data: Prisma.RoomViewingAppointmentUncheckedUpdateInput) {
    return this.prismaService.roomViewingAppointment.update({
      where: { id, tenantId },
      data,
      select: viewingAppointmentSelect,
    })
  }

  async cancelRenterAppointment(id: number, renterId: number) {
    return this.prismaService.roomViewingAppointment.update({
      where: { id, renterId },
      data: { status: 'CANCELED', updatedById: renterId },
      select: viewingAppointmentSelect,
    })
  }
}
