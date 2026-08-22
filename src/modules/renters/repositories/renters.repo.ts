import { Injectable } from '@nestjs/common'
import { ConflictException } from '@nestjs/common'
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
      occupation: true,
      verificationStatus: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.UserSelect

export const renterDetailSelect = {
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

export const renterInvitationSelect = {
  id: true,
  tenantId: true,
  email: true,
  fullName: true,
  phone: true,
  expiresAt: true,
  acceptedAt: true,
  acceptedUserId: true,
  revokedAt: true,
  createdAt: true,
  updatedAt: true,
  tenant: { select: { id: true, name: true } },
  createdBy: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.RenterInvitationSelect

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
        OR: [
          { rentalRequests: { some: { tenantId } } },
          { viewingAppointments: { some: { tenantId } } },
          { contracts: { some: { tenantId, deletedAt: null } } },
          { contractMembers: { some: { contract: { tenantId, deletedAt: null } } } },
          { rentalHistories: { some: { tenantId } } },
          { acceptedRenterInvitations: { some: { tenantId, acceptedAt: { not: null }, revokedAt: null } } },
        ],
      },
      select: buildTenantRenterDetailSelect(tenantId),
    })
  }

  async findRegisteredUser(email: string, phone?: string) {
    return this.prismaService.user.findFirst({
      where: {
        deletedAt: null,
        OR: [{ email }, ...(phone ? [{ phone }] : [])],
      },
      select: { id: true, email: true, phone: true, renterProfile: { select: { id: true } } },
    })
  }

  async createInvitation(input: {
    tenantId: number
    email: string
    fullName: string
    phone?: string
    codeHash: string
    expiresAt: Date
    createdById: number
  }) {
    return this.prismaService.$transaction(async (tx) => {
      await tx.renterInvitation.updateMany({
        where: { tenantId: input.tenantId, email: input.email, acceptedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      return tx.renterInvitation.create({
        data: {
          tenantId: input.tenantId,
          email: input.email,
          fullName: input.fullName,
          phone: input.phone ?? null,
          codeHash: input.codeHash,
          expiresAt: input.expiresAt,
          createdById: input.createdById,
        },
        select: renterInvitationSelect,
      })
    })
  }

  async findInvitation(tenantId: number, id: number) {
    return this.prismaService.renterInvitation.findFirst({
      where: { id, tenantId },
      select: renterInvitationSelect,
    })
  }

  async findValidInvitation(email: string, now: Date, maxAttempts: number) {
    return this.prismaService.renterInvitation.findFirst({
      where: { email, acceptedAt: null, revokedAt: null, expiresAt: { gt: now }, attempts: { lt: maxAttempts } },
      orderBy: { createdAt: 'desc' },
      select: { ...renterInvitationSelect, codeHash: true, attempts: true },
    })
  }

  recordInvitationFailure(id: number, maxAttempts: number) {
    return this.prismaService.renterInvitation.updateMany({
      where: { id, acceptedAt: null, revokedAt: null, attempts: { lt: maxAttempts } },
      data: { attempts: { increment: 1 } },
    })
  }

  async acceptInvitation(invitationId: number, email: string, passwordHash: string) {
    return this.prismaService.$transaction(async (tx) => {
      const acceptedAt = new Date()
      const claimed = await tx.renterInvitation.updateMany({
        where: { id: invitationId, email, acceptedAt: null, revokedAt: null, expiresAt: { gt: acceptedAt } },
        data: { acceptedAt },
      })
      if (claimed.count !== 1) {
        throw new ConflictException('Lời mời đã được sử dụng hoặc hết hạn')
      }

      const invitation = await tx.renterInvitation.findUniqueOrThrow({ where: { id: invitationId } })
      const user = await tx.user.create({
        data: {
          email,
          fullName: invitation.fullName,
          phone: invitation.phone,
          passwordHash,
          emailVerifiedAt: acceptedAt,
        },
        select: { id: true },
      })
      await tx.renterProfile.create({ data: { userId: user.id } })
      await tx.renterInvitation.update({ where: { id: invitationId }, data: { acceptedUserId: user.id } })

      return tx.user.findUniqueOrThrow({ where: { id: user.id }, select: renterDetailSelect })
    })
  }

  async updateTenantRenter(
    tenantId: number,
    renterId: number,
    userData: { fullName?: string; phone?: string | null },
    profileData: Prisma.RenterProfileUncheckedUpdateInput,
  ) {
    await this.prismaService.$transaction([
      this.prismaService.user.update({ where: { id: renterId }, data: userData }),
      this.prismaService.renterProfile.update({ where: { userId: renterId }, data: profileData }),
    ])
    return this.findTenantRenter(tenantId, renterId)
  }

  findHistory(where: Prisma.RentalHistoryWhereInput, skip: number, take: number) {
    return this.prismaService.$transaction([
      this.prismaService.rentalHistory.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          tenantId: true,
          roomId: true,
          contractId: true,
          startedAt: true,
          endedAt: true,
          status: true,
          createdAt: true,
          room: { select: { id: true, roomCode: true, title: true, property: { select: { id: true, name: true } } } },
          contract: { select: { id: true, contractCode: true, status: true } },
        },
      }),
      this.prismaService.rentalHistory.count({ where }),
    ])
  }
}
