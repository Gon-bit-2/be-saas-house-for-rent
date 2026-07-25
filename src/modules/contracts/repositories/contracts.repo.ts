import { Injectable } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import type { Prisma } from 'generated/prisma/client'

export const contractSelect = {
  id: true,
  tenantId: true,
  roomId: true,
  renterId: true,
  rentalRequestId: true,
  templateId: true,
  contractCode: true,
  startDate: true,
  endDate: true,
  monthlyPrice: true,
  depositAmount: true,
  billingCycle: true,
  paymentDueDay: true,
  contentSnapshot: true,
  status: true,
  signedByLandlordAt: true,
  signedByRenterAt: true,
  createdAt: true,
  updatedAt: true,
  room: {
    select: {
      id: true,
      roomCode: true,
      title: true,
      status: true,
      marketplaceStatus: true,
      maxOccupants: true,
      property: { select: { id: true, name: true, province: true, district: true, ward: true } },
    },
  },
  renter: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      renterProfile: { select: { id: true, verificationStatus: true } },
    },
  },
  rentalRequest: {
    select: {
      id: true,
      status: true,
      expectedStartDate: true,
      message: true,
    },
  },
  template: { select: { id: true, name: true } },
  members: {
    orderBy: [{ role: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      userId: true,
      role: true,
      createdAt: true,
      user: { select: { id: true, fullName: true, email: true, phone: true } },
    },
  },
  rentalHistories: {
    where: { status: 'ACTIVE' },
    take: 1,
    orderBy: { createdAt: 'desc' },
    select: { id: true, startedAt: true, endedAt: true, status: true, createdAt: true },
  },
} satisfies Prisma.ContractSelect

/**
 * Repository for tenant-scoped contract persistence and activation transactions.
 */
@Injectable()
export class ContractsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findContractsAndCount(where: Prisma.ContractWhereInput, skip: number, take: number) {
    return this.prismaService.$transaction([
      this.prismaService.contract.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }],
        select: contractSelect,
      }),
      this.prismaService.contract.count({ where }),
    ])
  }

  async findTenantContract(tenantId: number, id: number) {
    return this.prismaService.contract.findFirst({ where: { id, tenantId, deletedAt: null }, select: contractSelect })
  }

  async findMyContractsAndCount(userId: number, skip: number, take: number) {
    const where: Prisma.ContractWhereInput = {
      deletedAt: null,
      OR: [{ renterId: userId }, { members: { some: { userId } } }],
    }

    return this.prismaService.$transaction([
      this.prismaService.contract.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }],
        select: contractSelect,
      }),
      this.prismaService.contract.count({ where }),
    ])
  }

  async findMyContract(userId: number, id: number) {
    return this.prismaService.contract.findFirst({
      where: { id, deletedAt: null, OR: [{ renterId: userId }, { members: { some: { userId } } }] },
      select: contractSelect,
    })
  }

  async findRoomForContract(tenantId: number, roomId: number) {
    return this.prismaService.room.findFirst({
      where: { id: roomId, tenantId, deletedAt: null },
      select: { id: true, tenantId: true, status: true, maxOccupants: true },
    })
  }

  async findRentersWithProfiles(userIds: number[]) {
    return this.prismaService.user.findMany({
      where: { id: { in: userIds }, deletedAt: null, status: 'ACTIVE', renterProfile: { isNot: null } },
      select: { id: true },
    })
  }

  async findApprovedRentalRequest(tenantId: number, id: number) {
    return this.prismaService.rentalRequest.findFirst({
      where: { id, tenantId, status: 'APPROVED' },
      select: { id: true, tenantId: true, roomId: true, renterId: true, status: true },
    })
  }

  async findTenantTemplate(tenantId: number, id: number) {
    return this.prismaService.contractTemplate.findFirst({
      where: { id, tenantId, deletedById: null },
      select: { id: true },
    })
  }

  async isContractCodeTaken(contractCode: string, excludedContractId?: number) {
    const contract = await this.prismaService.contract.findFirst({
      where: { contractCode, ...(excludedContractId ? { id: { not: excludedContractId } } : {}) },
      select: { id: true },
    })
    return Boolean(contract)
  }

  async countActiveRoomContracts(roomId: number, excludedContractId?: number) {
    return this.prismaService.contract.count({
      where: {
        roomId,
        status: 'ACTIVE',
        deletedAt: null,
        ...(excludedContractId ? { id: { not: excludedContractId } } : {}),
      },
    })
  }

  /**
   * Creates the draft contract and its main/co-renter member rows atomically.
   */
  async createDraftContract(data: Prisma.ContractUncheckedCreateInput, coRenterIds: number[]) {
    return this.prismaService.$transaction(async (tx) => {
      const contract = await tx.contract.create({ data, select: { id: true, renterId: true } })
      await tx.contractMember.createMany({
        data: [
          { contractId: contract.id, userId: contract.renterId, role: 'MAIN_RENTER' },
          ...coRenterIds.map((userId) => ({ contractId: contract.id, userId, role: 'CO_RENTER' as const })),
        ],
      })

      return tx.contract.findUniqueOrThrow({ where: { id: contract.id }, select: contractSelect })
    })
  }

  /**
   * Updates editable contract fields and replaces co-renters only when provided.
   */
  async updateDraftContract(id: number, data: Prisma.ContractUncheckedUpdateInput, coRenterIds?: number[]) {
    return this.prismaService.$transaction(async (tx) => {
      await tx.contract.update({ where: { id }, data })

      if (coRenterIds) {
        await tx.contractMember.deleteMany({ where: { contractId: id, role: 'CO_RENTER' } })
        if (coRenterIds.length > 0) {
          await tx.contractMember.createMany({
            data: coRenterIds.map((userId) => ({ contractId: id, userId, role: 'CO_RENTER' })),
          })
        }
      }

      return tx.contract.findUniqueOrThrow({ where: { id }, select: contractSelect })
    })
  }

  /**
   * Activates a contract and moves the room/rental journey forward in one transaction.
   */
  async activateContract(tenantId: number, id: number, actorId: number) {
    return this.prismaService.$transaction(async (tx) => {
      const contract = await tx.contract.findFirstOrThrow({
        where: { id, tenantId, deletedAt: null },
        select: { id: true, roomId: true, renterId: true, rentalRequestId: true, startDate: true },
      })

      await tx.contract.update({ where: { id }, data: { status: 'ACTIVE', updatedById: actorId } })
      const room = await tx.room.findUniqueOrThrow({
        where: { id: contract.roomId },
        select: { tenantId: true, marketplaceStatus: true },
      })
      await tx.room.update({
        where: { id: contract.roomId },
        data: { status: 'OCCUPIED', marketplaceStatus: 'HIDDEN', updatedById: actorId },
      })
      if (room.marketplaceStatus !== 'HIDDEN') {
        await tx.marketplaceModeration.create({
          data: {
            roomId: contract.roomId,
            tenantId: room.tenantId,
            actorId,
            fromStatus: room.marketplaceStatus,
            toStatus: 'HIDDEN',
            reason: 'AUTO_CONTRACT_ACTIVATED',
          },
        })
      }
      await tx.rentalHistory.create({
        data: {
          tenantId,
          roomId: contract.roomId,
          renterId: contract.renterId,
          contractId: contract.id,
          startedAt: contract.startDate,
          status: 'ACTIVE',
        },
      })

      if (contract.rentalRequestId) {
        await tx.rentalRequest.update({
          where: { id: contract.rentalRequestId },
          data: { status: 'CONVERTED_TO_CONTRACT', updatedById: actorId },
        })
      }

      return tx.contract.findUniqueOrThrow({ where: { id }, select: contractSelect })
    })
  }

  async cancelContract(id: number, actorId: number) {
    return this.prismaService.contract.update({
      where: { id },
      data: { status: 'CANCELED', updatedById: actorId },
      select: contractSelect,
    })
  }
}
