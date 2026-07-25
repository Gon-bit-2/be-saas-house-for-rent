import { Injectable } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import type { Prisma } from 'generated/prisma/client'

export const renterSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  avatarUrl: true,
  status: true,
  createdAt: true,
  renterProfile: {
    select: {
      id: true,
      dateOfBirth: true,
      gender: true,
      identityNumber: true,
      identityFrontUrl: true,
      identityBackUrl: true,
      permanentAddress: true,
      occupation: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      verificationStatus: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.UserSelect

export const renterDetailSelect = {
  ...renterSelect,
  rentalRequests: {
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      tenantId: true,
      roomId: true,
      status: true,
      expectedStartDate: true,
      createdAt: true,
      room: { select: { id: true, roomCode: true, title: true, property: { select: { id: true, name: true } } } },
    },
  },
  viewingAppointments: {
    orderBy: { scheduledAt: 'desc' },
    take: 10,
    select: {
      id: true,
      tenantId: true,
      roomId: true,
      status: true,
      scheduledAt: true,
      createdAt: true,
      room: { select: { id: true, roomCode: true, title: true, property: { select: { id: true, name: true } } } },
    },
  },
} satisfies Prisma.UserSelect

const buildTenantRenterDetailSelect = (tenantId: number) =>
  ({
    ...renterSelect,
    rentalRequests: {
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        tenantId: true,
        roomId: true,
        status: true,
        expectedStartDate: true,
        createdAt: true,
        room: { select: { id: true, roomCode: true, title: true, property: { select: { id: true, name: true } } } },
      },
    },
    viewingAppointments: {
      where: { tenantId },
      orderBy: { scheduledAt: 'desc' },
      take: 10,
      select: {
        id: true,
        tenantId: true,
        roomId: true,
        status: true,
        scheduledAt: true,
        createdAt: true,
        room: { select: { id: true, roomCode: true, title: true, property: { select: { id: true, name: true } } } },
      },
    },
  }) satisfies Prisma.UserSelect

/**
 * Repository for renter profile and tenant-scoped renter lookup operations.
 */
@Injectable()
export class RentersRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findMe(userId: number) {
    return this.prismaService.user.findFirst({ where: { id: userId, deletedAt: null }, select: renterDetailSelect })
  }

  async updateProfile(userId: number, data: Prisma.RenterProfileUncheckedUpdateInput) {
    await this.prismaService.renterProfile.update({ where: { userId }, data })
    return this.findMe(userId)
  }

  async findManyAndCount(where: Prisma.UserWhereInput, skip: number, take: number) {
    return this.prismaService.$transaction([
      this.prismaService.user.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }],
        select: renterSelect,
      }),
      this.prismaService.user.count({ where }),
    ])
  }

  async findTenantRenter(tenantId: number, renterId: number) {
    return this.prismaService.user.findFirst({
      where: {
        id: renterId,
        deletedAt: null,
        renterProfile: { isNot: null },
        OR: [{ rentalRequests: { some: { tenantId } } }, { viewingAppointments: { some: { tenantId } } }],
      },
      select: buildTenantRenterDetailSelect(tenantId),
    })
  }
}
