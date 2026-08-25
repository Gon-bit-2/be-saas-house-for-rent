import { Injectable } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import type { Prisma } from 'generated/prisma/client'
import type { TRenterInfo, TAddContractMemberBodySchema } from '../model/contracts.model'

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
      renterProfile: {
        select: {
          id: true,
          verificationStatus: true,
          identityNumber: true,
          identityFrontUrl: true,
          identityBackUrl: true,
          permanentAddress: true,
        },
      },
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
  tenant: { select: { id: true, name: true, phone: true } },
  members: {
    orderBy: [{ role: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      contractId: true,
      userId: true,
      fullName: true,
      phone: true,
      age: true,
      identityCard: true,
      identityCardImageUrl: true,
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

  async findMany(where: Prisma.ContractWhereInput, skip: number, take: number) {
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

  async findById(tenantId: number, id: number) {
    return this.prismaService.contract.findFirst({ where: { id, tenantId, deletedAt: null }, select: contractSelect })
  }

  async findMine(userId: number, skip: number, take: number) {
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

  async getMine(userId: number, id: number) {
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
  async create(data: Prisma.ContractUncheckedCreateInput, coRenters: TAddContractMemberBodySchema[], renterInfo?: TRenterInfo) {
    return this.prismaService.$transaction(async (tx) => {
      const contract = await tx.contract.create({ data, select: { id: true, renterId: true } })
      await tx.contractMember.createMany({
        data: [
          { contractId: contract.id, userId: contract.renterId, role: 'MAIN_RENTER' },
          ...coRenters.map((renter) => ({ 
             contractId: contract.id, 
             userId: renter.userId || null, 
             fullName: renter.fullName || null,
             phone: renter.phone || null,
             age: renter.age || null,
             identityCard: renter.identityCard || null,
             identityCardImageUrl: renter.identityCardImageUrl || null,
             role: 'CO_RENTER' as const
          })),
        ],
      })

      if (renterInfo) {
        if (renterInfo.phone !== undefined) {
          await tx.user.update({
            where: { id: contract.renterId },
            data: { phone: renterInfo.phone },
          })
        }
        if (
          renterInfo.identityNumber !== undefined ||
          renterInfo.permanentAddress !== undefined ||
          renterInfo.identityFrontUrl !== undefined ||
          renterInfo.identityBackUrl !== undefined
        ) {
          const profileData = {
            identityNumber: renterInfo.identityNumber,
            permanentAddress: renterInfo.permanentAddress,
            identityFrontUrl: renterInfo.identityFrontUrl,
            identityBackUrl: renterInfo.identityBackUrl,
          }
          await tx.renterProfile.upsert({
            where: { userId: contract.renterId },
            create: { userId: contract.renterId, ...profileData },
            update: profileData,
          })
        }
      }

      return tx.contract.findUniqueOrThrow({ where: { id: contract.id }, select: contractSelect })
    })
  }

  /**
   * Updates editable contract fields and replaces co-renters only when provided.
   */
  async update(id: number, renterId: number, data: Prisma.ContractUncheckedUpdateInput, coRenters?: TAddContractMemberBodySchema[], renterInfo?: TRenterInfo) {
    return this.prismaService.$transaction(async (tx) => {
      await tx.contract.update({ where: { id }, data })

      if (coRenters) {
        await tx.contractMember.deleteMany({ where: { contractId: id, role: 'CO_RENTER' } })
        if (coRenters.length > 0) {
          await tx.contractMember.createMany({
            data: coRenters.map((renter) => ({ 
             contractId: id, 
             userId: renter.userId || null, 
             fullName: renter.fullName || null,
             phone: renter.phone || null,
             age: renter.age || null,
             identityCard: renter.identityCard || null,
             identityCardImageUrl: renter.identityCardImageUrl || null,
             role: 'CO_RENTER' as const
          })),
          })
        }
      }

      if (renterInfo) {
        if (renterInfo.phone !== undefined) {
          await tx.user.update({
            where: { id: renterId },
            data: { phone: renterInfo.phone },
          })
        }
        if (
          renterInfo.identityNumber !== undefined ||
          renterInfo.permanentAddress !== undefined ||
          renterInfo.identityFrontUrl !== undefined ||
          renterInfo.identityBackUrl !== undefined
        ) {
          const profileData = {
            identityNumber: renterInfo.identityNumber,
            permanentAddress: renterInfo.permanentAddress,
            identityFrontUrl: renterInfo.identityFrontUrl,
            identityBackUrl: renterInfo.identityBackUrl,
          }
          await tx.renterProfile.upsert({
            where: { userId: renterId },
            create: { userId: renterId, ...profileData },
            update: profileData,
          })
        }
      }

      return tx.contract.findUniqueOrThrow({ where: { id }, select: contractSelect })
    })
  }

  /**
   * Activates a contract and moves the room/rental journey forward in one transaction.
   */
  async activate(tenantId: number, id: number, actorId: number) {
    return this.prismaService.$transaction(
      async (tx) => {
        const contract = await tx.contract.findFirstOrThrow({
          where: { id, tenantId, deletedAt: null },
          select: { id: true, roomId: true, renterId: true, rentalRequestId: true, startDate: true },
        })

        const room = await tx.room.findFirstOrThrow({
          where: { id: contract.roomId, tenantId },
          select: { tenantId: true, marketplaceStatus: true },
        })
        const claimedRoom = await tx.room.updateMany({
          where: { id: contract.roomId, tenantId, status: { in: ['AVAILABLE', 'RESERVED'] }, deletedAt: null },
          data: { status: 'OCCUPIED', marketplaceStatus: 'HIDDEN', updatedById: actorId },
        })
        if (claimedRoom.count !== 1) throw new Error('CONTRACT_ROOM_CONFLICT')
        const activated = await tx.contract.updateMany({
          where: {
            id,
            tenantId,
            status: { in: ['DRAFT', 'WAITING_LANDLORD_SIGN', 'WAITING_RENTER_SIGN'] },
            deletedAt: null,
          },
          data: { status: 'ACTIVE', updatedById: actorId },
        })
        if (activated.count !== 1) throw new Error('CONTRACT_ACTIVATION_CONFLICT')
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

        await tx.auditLog.create({
          data: {
            tenantId,
            actorId,
            action: 'ACTIVATE_CONTRACT',
            entityType: 'CONTRACT',
            entityId: String(id),
            oldValues: { status: 'DRAFT_OR_WAITING' },
            newValues: { status: 'ACTIVE', roomStatus: 'OCCUPIED' },
          },
        })

        return tx.contract.findUniqueOrThrow({ where: { id }, select: contractSelect })
      },
      { isolationLevel: 'Serializable' },
    )
  }

  async expire(tenantId: number, id: number, actorId: number) {
    return this.prismaService.$transaction(
      async (tx) => {
        const contract = await tx.contract.findFirstOrThrow({
          where: { id, tenantId, status: 'ACTIVE', deletedAt: null },
          select: { id: true, roomId: true, endDate: true },
        })
        const expired = await tx.contract.updateMany({
          where: { id, tenantId, status: 'ACTIVE', deletedAt: null },
          data: { status: 'EXPIRED', updatedById: actorId },
        })
        if (expired.count !== 1) throw new Error('CONTRACT_EXPIRY_CONFLICT')
        const history = await tx.rentalHistory.updateMany({
          where: { contractId: id, status: 'ACTIVE' },
          data: { status: 'ENDED', endedAt: contract.endDate },
        })
        if (history.count !== 1) throw new Error('CONTRACT_EXPIRY_CONFLICT')

        const existingTermination = await tx.contractTerminationRequest.findFirst({
          where: { contractId: id, tenantId },
        })
        if (!existingTermination) {
          await tx.contractTerminationRequest.create({
            data: {
              tenantId,
              contractId: id,
              reason: 'Hợp đồng hết hạn (Tự động tạo)',
              expectedMoveOutDate: contract.endDate,
              status: 'APPROVED',
              reviewedAt: new Date(),
              reviewedById: actorId,
              reviewNote: 'Duyệt tự động do hết hạn hợp đồng',
            },
          })
        }

        await tx.auditLog.createMany({
          data: [
            {
              tenantId,
              actorId,
              action: 'EXPIRE_CONTRACT',
              entityType: 'CONTRACT',
              entityId: String(id),
              oldValues: { status: 'ACTIVE' },
              newValues: { status: 'EXPIRED' },
            },
          ],
        })
        return tx.contract.findUniqueOrThrow({ where: { id }, select: contractSelect })
      },
      { isolationLevel: 'Serializable' },
    )
  }

  async cancel(id: number, actorId: number) {
    return this.prismaService.$transaction(async (tx) => {
      const updated = await tx.contract.update({
        where: { id },
        data: { status: 'CANCELED', updatedById: actorId },
        select: contractSelect,
      })
      await tx.auditLog.create({
        data: {
          tenantId: updated.tenantId,
          actorId,
          action: 'CANCEL_CONTRACT',
          entityType: 'CONTRACT',
          entityId: String(id),
          newValues: { status: 'CANCELED' },
        },
      })
      return updated
    })
  }
  async removeMember(contractId: number, memberId: number) {
    return this.prismaService.$transaction(async (tx) => {
      await tx.contractMember.delete({
        where: { id: memberId },
      })
      return tx.contract.findUniqueOrThrow({ where: { id: contractId }, select: contractSelect })
    })
  }

  async addMember(contractId: number, memberData: TAddContractMemberBodySchema) {
    return this.prismaService.$transaction(async (tx) => {
      await tx.contractMember.create({
        data: { 
          contractId, 
          userId: memberData.userId || null,
          fullName: memberData.fullName || null,
          phone: memberData.phone || null,
          age: memberData.age || null,
          identityCard: memberData.identityCard || null,
          identityCardImageUrl: memberData.identityCardImageUrl || null,
          role: 'CO_RENTER' as const
        },
      })
      return tx.contract.findUniqueOrThrow({ where: { id: contractId }, select: contractSelect })
    })
  }

  async signLandlord(id: number, actorId: number, signature: string) {
    return this.prismaService.$transaction(async (tx) => {
      const updated = await tx.contract.update({
        where: { id },
        data: {
          landlordSignature: signature,
          signedByLandlordAt: new Date(),
          status: 'WAITING_RENTER_SIGN',
          updatedById: actorId,
        },
        select: contractSelect,
      })
      await tx.auditLog.create({
        data: {
          tenantId: updated.tenantId,
          actorId,
          action: 'SIGN_CONTRACT_LANDLORD',
          entityType: 'CONTRACT',
          entityId: String(id),
          newValues: { status: 'WAITING_RENTER_SIGN', signedByLandlordAt: new Date() },
        },
      })
      return updated
    })
  }

  async signRenter(id: number, actorId: number, signature: string) {
    return this.prismaService.$transaction(async (tx) => {
      const updated = await tx.contract.update({
        where: { id },
        data: {
          renterSignature: signature,
          signedByRenterAt: new Date(),
          status: 'ACTIVE',
          updatedById: actorId,
        },
        select: contractSelect,
      })
      await tx.auditLog.create({
        data: {
          tenantId: updated.tenantId,
          actorId,
          action: 'SIGN_CONTRACT_RENTER',
          entityType: 'CONTRACT',
          entityId: String(id),
          newValues: { status: 'ACTIVE', signedByRenterAt: new Date() },
        },
      })
      return updated
    })
  }
}
