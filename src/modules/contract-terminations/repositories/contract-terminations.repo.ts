import { ConflictException, Injectable } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import type { Prisma, TerminationRequestStatus } from 'generated/prisma/client'

export const terminationSelect = {
  id: true,
  tenantId: true,
  contractId: true,
  reason: true,
  expectedMoveOutDate: true,
  status: true,
  reviewNote: true,
  reviewedById: true,
  reviewedAt: true,
  actualMoveOutDate: true,
  completedAt: true,
  completionNote: true,
  outstandingDebt: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, fullName: true } },
  reviewedBy: { select: { id: true, fullName: true } },
  contract: {
    select: {
      id: true,
      contractCode: true,
      status: true,
      renterId: true,
      startDate: true,
      endDate: true,
      renter: { select: { id: true, fullName: true } },
      room: { select: { id: true, roomCode: true, title: true, status: true, marketplaceStatus: true } },
    },
  },
} satisfies Prisma.ContractTerminationRequestSelect

@Injectable()
export class ContractTerminationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(where: Prisma.ContractTerminationRequestWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.contractTerminationRequest.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: terminationSelect,
      }),
      this.prisma.contractTerminationRequest.count({ where }),
    ])
  }

  findMine(userId: number, where: Prisma.ContractTerminationRequestWhereInput, skip: number, take: number) {
    return this.findMany(
      { ...where, contract: { OR: [{ renterId: userId }, { members: { some: { userId } } }] } },
      skip,
      take,
    )
  }

  findById(tenantId: number, id: number) {
    return this.prisma.contractTerminationRequest.findFirst({ where: { id, tenantId }, select: terminationSelect })
  }

  getMine(userId: number, id: number) {
    return this.prisma.contractTerminationRequest.findFirst({
      where: { id, contract: { OR: [{ renterId: userId }, { members: { some: { userId } } }] } },
      select: terminationSelect,
    })
  }

  getContract(tenantId: number, contractId: number) {
    return this.prisma.contract.findFirst({
      where: { id: contractId, tenantId, deletedAt: null },
      select: { id: true, tenantId: true, renterId: true, roomId: true, status: true, startDate: true, endDate: true },
    })
  }

  getMyContract(userId: number, contractId: number) {
    return this.prisma.contract.findFirst({
      where: { id: contractId, renterId: userId, deletedAt: null },
      select: { id: true, tenantId: true, renterId: true, roomId: true, status: true, startDate: true, endDate: true },
    })
  }

  create(data: Prisma.ContractTerminationRequestUncheckedCreateInput, actorId: number) {
    return this.prisma.$transaction(
      async (tx) => {
        const created = await tx.contractTerminationRequest.create({ data, select: terminationSelect })
        await tx.auditLog.create({
          data: {
            tenantId: created.tenantId,
            actorId,
            action: 'CREATE_CONTRACT_TERMINATION',
            entityType: 'CONTRACT_TERMINATION',
            entityId: String(created.id),
            newValues: {
              contractId: created.contractId,
              status: created.status,
              expectedMoveOutDate: created.expectedMoveOutDate.toISOString().slice(0, 10),
            },
          },
        })
        return created
      },
      { isolationLevel: 'Serializable' },
    )
  }

  update(input: {
    tenantId: number
    id: number
    statuses: TerminationRequestStatus[]
    data: Prisma.ContractTerminationRequestUncheckedUpdateManyInput
    actorId: number
    action: string
  }) {
    return this.prisma.$transaction(
      async (tx) => {
        const result = await tx.contractTerminationRequest.updateMany({
          where: { id: input.id, tenantId: input.tenantId, status: { in: input.statuses } },
          data: input.data,
        })
        if (result.count !== 1) return null
        const updated = await tx.contractTerminationRequest.findUniqueOrThrow({
          where: { id: input.id },
          select: terminationSelect,
        })
        await tx.auditLog.create({
          data: {
            tenantId: input.tenantId,
            actorId: input.actorId,
            action: input.action,
            entityType: 'CONTRACT_TERMINATION',
            entityId: String(input.id),
            newValues: { status: updated.status, reviewNote: updated.reviewNote },
          },
        })
        return updated
      },
      { isolationLevel: 'Serializable' },
    )
  }

  complete(input: {
    tenantId: number
    id: number
    handoverId: number
    actualMoveOutDate: Date
    acknowledgeDebt: boolean
    completionNote?: string | null
    actorId: number
  }) {
    return this.prisma.$transaction(
      async (tx) => {
        const request = await tx.contractTerminationRequest.findFirst({
          where: { id: input.id, tenantId: input.tenantId, status: 'APPROVED' },
          select: {
            id: true,
            contractId: true,
            contract: {
              select: {
                id: true,
                roomId: true,
                renterId: true,
                status: true,
                startDate: true,
                room: { select: { status: true, marketplaceStatus: true } },
              },
            },
          },
        })
        if (!request) return { kind: 'conflict' as const }
        const checkout = await tx.handoverRecord.findFirst({
          where: {
            id: input.handoverId,
            tenantId: input.tenantId,
            contractId: request.contractId,
            type: 'CHECKOUT',
            status: 'CONFIRMED',
          },
          select: {
            id: true,
            assetItems: { select: { condition: true, expectedQuantity: true, actualQuantity: true } },
          },
        })
        if (!checkout) return { kind: 'handover' as const }
      // 1. Lấy thông tin Hợp đồng và Biên bản bàn giao
      const contractInfo = await tx.contract.findUnique({
        where: { id: request.contractId },
        select: { depositAmount: true, monthlyPrice: true }
      })
      
      const handover = await tx.handoverRecord.findUnique({
        where: { id: input.handoverId },
        include: { assetItems: true }
      })
      // 2. Tính toán các chi phí phát sinh từ Biên bản bàn giao (nếu có)
      // Giả định bạn có logic tính tiền điện nước dựa trên chênh lệch chỉ số mới nhất
      const electricityFee = 0 // Thay bằng hàm tính toán thực tế
      const waterFee = 0 // Thay bằng hàm tính toán thực tế
      const damageFee = 0 // Thay bằng tổng tiền phạt từ handover.assetItems
      
      // 3. Khởi tạo Hóa Đơn Quyết Toán (Final Invoice)
      const finalInvoice = await tx.invoice.create({
        data: {
          tenantId: input.tenantId,
          contractId: request.contractId,
          roomId: request.contract.roomId,
          renterId: request.contract.renterId,
          invoiceCode: `INV-FINAL-${request.contractId}-${Date.now()}`,
          billingMonth: new Date(),
          issueDate: new Date(),
          dueDate: new Date(),
          subtotal: electricityFee + waterFee + damageFee, // Tạm tính tổng phí phát sinh
          discountAmount: contractInfo?.depositAmount ?? 0, // HOÀN CỌC: Dùng depositAmount làm khoản giảm trừ!
          penaltyAmount: 0,
          totalAmount: Math.max(0, (electricityFee + waterFee + damageFee) - Number(contractInfo?.depositAmount ?? 0)),
          debtAmount: Math.max(0, (electricityFee + waterFee + damageFee) - Number(contractInfo?.depositAmount ?? 0)),
          status: 'UNPAID',
          note: 'Hóa đơn Quyết Toán Thanh Lý Hợp Đồng (Đã khấu trừ tiền cọc)',
          createdById: input.actorId,
          updatedById: input.actorId,
          items: {
            create: [
              { itemType: 'ELECTRICITY', description: 'Tiền điện chốt cuối kỳ', quantity: 1, unitPrice: electricityFee, amount: electricityFee },
              { itemType: 'WATER', description: 'Tiền nước chốt cuối kỳ', quantity: 1, unitPrice: waterFee, amount: waterFee },
              { itemType: 'OTHER', description: 'Tiền đền bù hư hỏng tài sản', quantity: 1, unitPrice: damageFee, amount: damageFee },
              { itemType: 'DISCOUNT', description: 'Hoàn lại tiền cọc ban đầu', quantity: 1, unitPrice: -Number(contractInfo?.depositAmount ?? 0), amount: -Number(contractInfo?.depositAmount ?? 0) }
            ]
          }
        }
      })
      // 4. Nếu khách còn nợ thêm (Total Amount > 0) và chưa xác nhận công nợ -> Báo lỗi
      if (finalInvoice.totalAmount.toNumber() > 0 && !input.acknowledgeDebt) {
        throw new ConflictException({
          message: 'Tiền cọc không đủ bù chi phí. Hợp đồng phát sinh công nợ; cần xác nhận trước khi hoàn tất',
          outstandingDebt: finalInvoice.totalAmount,
        })
      }
      // 5. Nếu tổng hóa đơn <= 0, tự động đánh dấu hóa đơn là PAID (Khách không nợ gì thêm)
      if (finalInvoice.totalAmount.toNumber() === 0) {
        await tx.invoice.update({
          where: { id: finalInvoice.id },
          data: { status: 'PAID' }
        })
      }

      const outstandingDebt = finalInvoice.totalAmount

      const contractResult = await tx.contract.updateMany({
        where: { id: request.contractId, tenantId: input.tenantId, status: { in: ['ACTIVE', 'EXPIRED'] }, deletedAt: null },
        data: { status: 'TERMINATED', updatedById: input.actorId },
      })
      if (contractResult.count !== 1) return { kind: 'conflict' as const }
      const requestResult = await tx.contractTerminationRequest.updateMany({
        where: { id: request.id, status: 'APPROVED' },
        data: {
          status: 'COMPLETED',
          actualMoveOutDate: input.actualMoveOutDate,
          completedAt: new Date(),
          completionNote: input.completionNote ?? null,
          outstandingDebt,
          updatedById: input.actorId,
        },
      })
      if (requestResult.count !== 1) return { kind: 'conflict' as const }
        const historyResult = await tx.rentalHistory.updateMany({
          where: { contractId: request.contractId, status: { in: ['ACTIVE', 'ENDED'] } },
          data: { status: 'TERMINATED', endedAt: input.actualMoveOutDate },
        })
        if (historyResult.count !== 1) throw new Error('RENTAL_HISTORY_NOT_FOUND')

        const hasDamage = checkout.assetItems.some(
          (item) => ['DAMAGED', 'LOST'].includes(item.condition) || item.actualQuantity < item.expectedQuantity,
        )
        const otherActive = await tx.contract.count({
          where: { roomId: request.contract.roomId, status: 'ACTIVE', deletedAt: null },
        })
        const roomStatus = otherActive > 0 ? 'OCCUPIED' : hasDamage ? 'MAINTENANCE' : 'AVAILABLE'
        await tx.room.update({
          where: { id: request.contract.roomId },
          data: { status: roomStatus, marketplaceStatus: 'HIDDEN', updatedById: input.actorId },
        })
        if (request.contract.room.marketplaceStatus !== 'HIDDEN') {
          await tx.marketplaceModeration.create({
            data: {
              roomId: request.contract.roomId,
              tenantId: input.tenantId,
              actorId: input.actorId,
              fromStatus: request.contract.room.marketplaceStatus,
              toStatus: 'HIDDEN',
              reason: 'AUTO_CONTRACT_TERMINATED',
            },
          })
        }

        await tx.auditLog.createMany({
          data: [
            {
              tenantId: input.tenantId,
              actorId: input.actorId,
              action: 'COMPLETE_CONTRACT_TERMINATION',
              entityType: 'CONTRACT_TERMINATION',
              entityId: String(request.id),
              oldValues: { status: 'APPROVED' },
              newValues: { status: 'COMPLETED', handoverId: checkout.id, outstandingDebt: String(outstandingDebt) },
            },
            {
              tenantId: input.tenantId,
              actorId: input.actorId,
              action: 'TERMINATE_CONTRACT',
              entityType: 'CONTRACT',
              entityId: String(request.contractId),
              oldValues: { status: request.contract.status },
              newValues: { status: 'TERMINATED' },
            },
            {
              tenantId: input.tenantId,
              actorId: input.actorId,
              action: 'RELEASE_ROOM_AFTER_TERMINATION',
              entityType: 'ROOM',
              entityId: String(request.contract.roomId),
              newValues: { status: roomStatus, marketplaceStatus: 'HIDDEN' },
            },
          ],
        })
        const updated = await tx.contractTerminationRequest.findUniqueOrThrow({
          where: { id: request.id },
          select: terminationSelect,
        })
        return { kind: 'completed' as const, data: updated, roomStatus }
      },
      { isolationLevel: 'Serializable' },
    )
  }
}
