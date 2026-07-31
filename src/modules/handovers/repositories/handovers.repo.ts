import { Injectable } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import type { HandoverStatus, Prisma } from 'generated/prisma/client'

export const handoverSelect = {
  id: true,
  tenantId: true,
  contractId: true,
  roomId: true,
  type: true,
  note: true,
  status: true,
  version: true,
  contentHash: true,
  signedByLandlordId: true,
  signedByLandlordAt: true,
  signedByRenterId: true,
  signedByRenterAt: true,
  confirmedAt: true,
  disputedById: true,
  disputeReason: true,
  disputedAt: true,
  resolvedById: true,
  resolutionNote: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
  room: { select: { id: true, roomCode: true, title: true, status: true } },
  contract: { select: { id: true, contractCode: true, status: true, renterId: true, startDate: true, endDate: true } },
  assetItems: {
    orderBy: { id: 'asc' },
    select: {
      id: true,
      roomAssetId: true,
      assetName: true,
      categoryName: true,
      expectedQuantity: true,
      actualQuantity: true,
      condition: true,
      note: true,
      imageUrl: true,
    },
  },
} satisfies Prisma.HandoverRecordSelect

type ItemInput = {
  roomAssetId: number
  assetName: string
  categoryName: string
  expectedQuantity: number
  actualQuantity: number
  condition: 'NEW' | 'GOOD' | 'NORMAL' | 'DAMAGED' | 'LOST'
  note?: string | null
  imageUrl?: string | null
}

@Injectable()
export class HandoversRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(where: Prisma.HandoverRecordWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.handoverRecord.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: handoverSelect,
      }),
      this.prisma.handoverRecord.count({ where }),
    ])
  }

  findMine(userId: number, where: Prisma.HandoverRecordWhereInput, skip: number, take: number) {
    const mine: Prisma.HandoverRecordWhereInput = {
      ...where,
      contract: { OR: [{ renterId: userId }, { members: { some: { userId } } }] },
    }
    return this.findMany(mine, skip, take)
  }

  findById(tenantId: number, id: number) {
    return this.prisma.handoverRecord.findFirst({ where: { id, tenantId }, select: handoverSelect })
  }

  getMine(userId: number, id: number) {
    return this.prisma.handoverRecord.findFirst({
      where: { id, contract: { OR: [{ renterId: userId }, { members: { some: { userId } } }] } },
      select: handoverSelect,
    })
  }

  getContract(tenantId: number, contractId: number) {
    return this.prisma.contract.findFirst({
      where: { id: contractId, tenantId, deletedAt: null },
      select: {
        id: true,
        tenantId: true,
        roomId: true,
        renterId: true,
        status: true,
        terminationRequests: { where: { status: 'APPROVED' }, take: 1, select: { id: true } },
      },
    })
  }

  getAssets(roomId: number) {
    return this.prisma.roomAsset.findMany({
      where: { roomId, deletedAt: null },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        quantity: true,
        condition: true,
        description: true,
        imageUrl: true,
        category: { select: { name: true } },
      },
    })
  }

  getCheckin(contractId: number) {
    return this.prisma.handoverRecord.findFirst({
      where: { contractId, type: 'CHECKIN', status: 'CONFIRMED' },
      select: {
        assetItems: {
          orderBy: { id: 'asc' },
          select: {
            roomAssetId: true,
            assetName: true,
            categoryName: true,
            actualQuantity: true,
            condition: true,
            note: true,
            imageUrl: true,
          },
        },
      },
    })
  }

  create(data: Prisma.HandoverRecordUncheckedCreateInput, items: ItemInput[], actorId: number) {
    return this.prisma.$transaction(
      async (tx) => {
        const created = await tx.handoverRecord.create({ data, select: { id: true, tenantId: true } })
        if (items.length > 0)
          await tx.handoverAssetItem.createMany({
            data: items.map((item) => ({ ...item, handoverRecordId: created.id })),
          })
        await tx.auditLog.create({
          data: {
            tenantId: created.tenantId,
            actorId,
            action: 'CREATE_HANDOVER',
            entityType: 'HANDOVER_RECORD',
            entityId: String(created.id),
            newValues: { type: data.type, contractId: data.contractId, version: 1 },
          },
        })
        return tx.handoverRecord.findUniqueOrThrow({ where: { id: created.id }, select: handoverSelect })
      },
      { isolationLevel: 'Serializable' },
    )
  }

  update(input: {
    tenantId: number
    id: number
    version: number
    statuses: HandoverStatus[]
    data: Prisma.HandoverRecordUncheckedUpdateManyInput
    items?: ItemInput[]
    actorId: number
    action: string
    requireUnsigned?: boolean
    finalizeConfirmation?: boolean
  }) {
    return this.prisma.$transaction(
      async (tx) => {
        const result = await tx.handoverRecord.updateMany({
          where: {
            id: input.id,
            tenantId: input.tenantId,
            version: input.version,
            status: { in: input.statuses },
            ...(input.requireUnsigned ? { signedByLandlordAt: null, signedByRenterAt: null } : {}),
          },
          data: input.data,
        })
        if (result.count !== 1) return null

        if (input.items) {
          await tx.handoverAssetItem.deleteMany({ where: { handoverRecordId: input.id } })
          if (input.items.length > 0)
            await tx.handoverAssetItem.createMany({
              data: input.items.map((item) => ({ ...item, handoverRecordId: input.id })),
            })
        }

        let current = await tx.handoverRecord.findUniqueOrThrow({ where: { id: input.id }, select: handoverSelect })
        if (
          input.finalizeConfirmation &&
          current.signedByLandlordAt &&
          current.signedByRenterAt &&
          current.status === 'DRAFT'
        ) {
          current = await tx.handoverRecord.update({
            where: { id: input.id },
            data: { status: 'CONFIRMED', confirmedAt: new Date() },
            select: handoverSelect,
          })
        }
        await tx.auditLog.create({
          data: {
            tenantId: input.tenantId,
            actorId: input.actorId,
            action: input.action,
            entityType: 'HANDOVER_RECORD',
            entityId: String(input.id),
            oldValues: { version: input.version },
            newValues: { version: current.version, status: current.status },
          },
        })
        return current
      },
      { isolationLevel: 'Serializable' },
    )
  }
}
