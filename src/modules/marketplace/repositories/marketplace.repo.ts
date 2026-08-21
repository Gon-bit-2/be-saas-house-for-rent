import { Injectable } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import { Prisma } from 'generated/prisma/client'

const marketplaceRoomImageSelect = {
  id: true,
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

export const marketplaceRoomSelect = {
  id: true,
  title: true,
  description: true,
  basePrice: true,
  area: true,
  floor: true,
  roomCode: true,
  status: true,
  tenantId: true,
  propertyId: true,
  property: {
    select: {
      id: true,
      name: true,
      addressDetail: true,
      latitude: true,
      longitude: true,
      wardCode: true,
      ward: true,
      district: true,
      province: true,
      provinceCode: true,
    },
  },
  images: {
    select: {
      id: true,
      url: true,
    },
    orderBy: { sortOrder: 'asc' },
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
  tenant: {
    select: {
      id: true,
      name: true,
      verificationStatus: true,
      createdAt: true,
    },
  },
} satisfies Prisma.RoomSelect

const rentalRequestSelect = {
  id: true,
  status: true,
  tenantId: true,
  roomId: true,
  renterId: true,
  room: {
    select: {
      roomCode: true,
      title: true,
    },
  },
} satisfies Prisma.RentalRequestSelect

const viewingAppointmentSelect = {
  id: true,
  status: true,
  tenantId: true,
  roomId: true,
  renterId: true,
  room: {
    select: {
      roomCode: true,
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

  async findActiveAmenities(where: Prisma.AmenityWhereInput, skip: number, take: number) {
    const select = { id: true, name: true, icon: true, category: true } satisfies Prisma.AmenitySelect
    return this.prismaService.$transaction([
      this.prismaService.amenity.findMany({
        where: { ...where, isActive: true },
        skip,
        take,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        select,
      }),
      this.prismaService.amenity.count({ where: { ...where, isActive: true } }),
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

  async findPropertyIdsWithinRadius(lat: number, lng: number, radiusKm: number): Promise<number[]> {
    const properties = await this.prismaService.$queryRaw<{ id: number }[]>`
      SELECT id FROM properties
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND (
        6371 * acos(
          cos(radians(${lat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${lng})) +
          sin(radians(${lat})) * sin(radians(latitude))
        )
      ) <= ${radiusKm}
    `
    return properties.map((p) => p.id)
  }
}
