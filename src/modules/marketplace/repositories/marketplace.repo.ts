import { Injectable } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import { Prisma } from 'generated/prisma/client'

const marketplaceRoomImageSelect = {
  id: true,
  url: true,
  caption: true,
  sortOrder: true,
  isThumbnail: true,
} satisfies Prisma.RoomImageSelect

export const marketplaceRoomSelect = {
  id: true,
  tenantId: true,
  propertyId: true,
  floorId: true,
  roomCode: true,
  title: true,
  area: true,
  maxOccupants: true,
  basePrice: true,
  depositAmount: true,
  electricityPrice: true,
  waterPrice: true,
  description: true,
  status: true,
  marketplaceStatus: true,
  publishedAt: true,
  property: {
    select: {
      id: true,
      name: true,
      type: true,
      province: true,
      provinceCode: true,
      district: true,
      ward: true,
      wardCode: true,
      addressDetail: true,
      latitude: true,
      longitude: true,
      status: true,
    },
  },
  floor: {
    select: {
      id: true,
      name: true,
      floorNumber: true,
    },
  },
  images: {
    orderBy: [{ isThumbnail: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }],
    select: marketplaceRoomImageSelect,
  },
  amenities: {
    select: {
      amenity: {
        select: {
          id: true,
          name: true,
          icon: true,
          category: true,
        },
      },
    },
  },
} satisfies Prisma.RoomSelect

const rentalRequestSelect = {
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
} satisfies Prisma.RentalRequestSelect

const viewingAppointmentSelect = {
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
 * Repository for public marketplace room discovery and tenant rental lead creation.
 */
@Injectable()
export class MarketplaceRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(where: Prisma.RoomWhereInput, skip: number, take: number) {
    return this.prismaService.$transaction([
      this.prismaService.room.findMany({
        where,
        skip,
        take,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        select: marketplaceRoomSelect,
      }),
      this.prismaService.room.count({ where }),
    ])
  }

  async findById(id: number) {
    return this.prismaService.room.findFirst({
      where: {
        id,
        deletedAt: null,
        status: 'AVAILABLE',
        marketplaceStatus: 'PUBLISHED',
        tenant: { deletedAt: null, status: 'ACTIVE' },
        property: { deletedAt: null, status: 'ACTIVE' },
      },
      select: marketplaceRoomSelect,
    })
  }

  async findRenterProfile(userId: number) {
    return this.prismaService.renterProfile.findUnique({ where: { userId }, select: { id: true } })
  }

  async findActiveRentalRequest(renterId: number, roomId: number) {
    return this.prismaService.rentalRequest.findFirst({
      where: {
        renterId,
        roomId,
        status: { in: ['PENDING', 'NEED_MORE_INFO', 'APPROVED'] },
      },
      select: { id: true, status: true },
    })
  }

  async findAppointmentForRenterRoom(appointmentId: number, renterId: number, roomId: number) {
    return this.prismaService.roomViewingAppointment.findFirst({
      where: { id: appointmentId, renterId, roomId },
      select: { id: true, status: true },
    })
  }

  async createRentalRequest(data: Prisma.RentalRequestUncheckedCreateInput) {
    return this.prismaService.rentalRequest.create({ data, select: rentalRequestSelect })
  }

  async createViewingAppointmentWithConflictCheck(
    data: {
      tenantId: number
      roomId: number
      renterId: number
      scheduledAt: Date
      note: string | null
      status: 'PENDING'
      createdById: number
    },
    durationMinutes: number,
  ) {
    return this.prismaService.$transaction(
      async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT 1 FROM pg_advisory_xact_lock(41004, ${data.roomId})`)
        const before = new Date(data.scheduledAt.getTime() - durationMinutes * 60_000)
        const after = new Date(data.scheduledAt.getTime() + durationMinutes * 60_000)
        const conflict = await tx.roomViewingAppointment.findFirst({
          where: {
            tenantId: data.tenantId,
            roomId: data.roomId,
            status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] },
            scheduledAt: { gt: before, lt: after },
          },
          select: { id: true },
        })
        if (conflict) throw new Error('APPOINTMENT_CONFLICT')
        return tx.roomViewingAppointment.create({ data, select: viewingAppointmentSelect })
      },
      { isolationLevel: 'Serializable' },
    )
  }
}
