import { Injectable } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import type { DebtStatus, InvoiceStatus, Prisma } from 'generated/prisma/client'

export const invoiceSelect = {
  id: true,
  tenantId: true,
  batchId: true,
  contractId: true,
  roomId: true,
  renterId: true,
  invoiceCode: true,
  billingMonth: true,
  issueDate: true,
  dueDate: true,
  subtotal: true,
  discountAmount: true,
  penaltyAmount: true,
  totalAmount: true,
  paidAmount: true,
  debtAmount: true,
  status: true,
  note: true,
  createdAt: true,
  updatedAt: true,
  contract: { select: { id: true, contractCode: true, status: true, startDate: true, endDate: true } },
  room: {
    select: {
      id: true,
      roomCode: true,
      title: true,
      property: { select: { id: true, name: true, province: true, district: true, ward: true } },
    },
  },
  renter: { select: { id: true, fullName: true, email: true, phone: true } },
  items: {
    orderBy: { id: 'asc' },
    select: {
      id: true,
      itemType: true,
      description: true,
      quantity: true,
      unitPrice: true,
      amount: true,
      meterReadingId: true,
      meterReading: { select: { id: true, previousValue: true, currentValue: true, consumption: true } },
    },
  },
  debt: {
    select: {
      id: true,
      originalAmount: true,
      paidAmount: true,
      remainingAmount: true,
      status: true,
      dueDate: true,
      resolvedAt: true,
    },
  },
  _count: { select: { payments: true } },
} satisfies Prisma.InvoiceSelect

export const debtSelect = {
  id: true,
  tenantId: true,
  invoiceId: true,
  contractId: true,
  roomId: true,
  renterId: true,
  billingMonth: true,
  originalAmount: true,
  paidAmount: true,
  remainingAmount: true,
  status: true,
  dueDate: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
  invoice: {
    select: { id: true, invoiceCode: true, status: true, totalAmount: true, paidAmount: true, debtAmount: true },
  },
  contract: { select: { id: true, contractCode: true, status: true } },
  room: {
    select: {
      id: true,
      roomCode: true,
      title: true,
      property: { select: { id: true, name: true, province: true, district: true, ward: true } },
    },
  },
  renter: { select: { id: true, fullName: true, email: true, phone: true } },
} satisfies Prisma.DebtSelect

export type InvoiceItemDraft = {
  itemType: 'RENT' | 'ELECTRICITY' | 'WATER' | 'SERVICE' | 'PARKING' | 'INTERNET' | 'PENALTY' | 'DISCOUNT' | 'OTHER'
  description: string
  quantity: number
  unitPrice: number
  amount: number
  meterReadingId?: number | null
}

export type InvoiceTotals = {
  subtotal: number
  discountAmount: number
  penaltyAmount: number
  totalAmount: number
  paidAmount: number
  debtAmount: number
}

/**
 * Repository for invoice, invoice item and debt persistence.
 */
@Injectable()
export class InvoicesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findInvoicesAndCount(where: Prisma.InvoiceWhereInput, skip: number, take: number) {
    return this.prismaService.$transaction([
      this.prismaService.invoice.findMany({
        where,
        skip,
        take,
        orderBy: [{ billingMonth: 'desc' }, { createdAt: 'desc' }],
        select: invoiceSelect,
      }),
      this.prismaService.invoice.count({ where }),
    ])
  }

  async findDebtsAndCount(where: Prisma.DebtWhereInput, skip: number, take: number) {
    return this.prismaService.$transaction([
      this.prismaService.debt.findMany({
        where,
        skip,
        take,
        orderBy: [{ dueDate: 'asc' }, { id: 'desc' }],
        select: debtSelect,
      }),
      this.prismaService.debt.count({ where }),
    ])
  }

  async getDebtStats(where: Prisma.DebtWhereInput, today: Date) {
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30)
    const activeDebtWhere: Prisma.DebtWhereInput = {
      ...where,
      status: { notIn: ['PAID', 'CANCELED'] },
      remainingAmount: { gt: 0 },
    }
    const sumRemaining = (extraWhere: Prisma.DebtWhereInput = {}) =>
      this.prismaService.debt.aggregate({
        where: { AND: [activeDebtWhere, extraWhere] },
        _sum: { remainingAmount: true },
      })

    const [total, overdueMoreThan30Days, overdueWithin30Days, currentNotDue] = await Promise.all([
      sumRemaining(),
      sumRemaining({ dueDate: { lt: thirtyDaysAgo } }),
      sumRemaining({ dueDate: { gte: thirtyDaysAgo, lt: today } }),
      sumRemaining({ dueDate: { gte: today } }),
    ])

    return {
      totalOutstanding: total._sum.remainingAmount,
      overdueMoreThan30Days: overdueMoreThan30Days._sum.remainingAmount,
      overdueWithin30Days: overdueWithin30Days._sum.remainingAmount,
      currentNotDue: currentNotDue._sum.remainingAmount,
    }
  }

  async findTenantInvoice(tenantId: number, id: number) {
    return this.prismaService.invoice.findFirst({ where: { id, tenantId, deletedAt: null }, select: invoiceSelect })
  }

  async findMyInvoicesAndCount(userId: number, skip: number, take: number) {
    const where: Prisma.InvoiceWhereInput = { renterId: userId, deletedAt: null }
    return this.prismaService.$transaction([
      this.prismaService.invoice.findMany({
        where,
        skip,
        take,
        orderBy: [{ billingMonth: 'desc' }],
        select: invoiceSelect,
      }),
      this.prismaService.invoice.count({ where }),
    ])
  }

  async findMyInvoice(userId: number, id: number) {
    return this.prismaService.invoice.findFirst({
      where: { id, renterId: userId, deletedAt: null },
      select: invoiceSelect,
    })
  }

  async findActiveContractForInvoice(tenantId: number, contractId: number, monthStart: Date, monthEnd: Date) {
    return this.prismaService.contract.findFirst({
      where: {
        id: contractId,
        tenantId,
        status: 'ACTIVE',
        deletedAt: null,
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
      },
      select: {
        id: true,
        tenantId: true,
        roomId: true,
        renterId: true,
        contractCode: true,
        monthlyPrice: true,
        paymentDueDay: true,
        room: { select: { id: true, roomCode: true, title: true, deletedAt: true } },
      },
    })
  }

  async findActiveContractsForInvoiceGeneration(monthStart: Date, monthEnd: Date) {
    return this.prismaService.contract.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
        invoices: {
          none: {
            billingMonth: monthStart,
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        tenantId: true,
        roomId: true,
        renterId: true,
        contractCode: true,
        monthlyPrice: true,
        paymentDueDay: true,
        room: { select: { id: true, roomCode: true, title: true, deletedAt: true } },
      },
    })
  }

  async findExistingInvoiceForContractMonth(contractId: number, billingMonth: Date, excludedInvoiceId?: number) {
    return this.prismaService.invoice.findFirst({
      where: {
        contractId,
        billingMonth,
        deletedAt: null,
        status: { not: 'CANCELED' },
        ...(excludedInvoiceId ? { id: { not: excludedInvoiceId } } : {}),
      },
      select: { id: true, invoiceCode: true },
    })
  }

  async findConfirmedReadingsForInvoice(tenantId: number, contractId: number, roomId: number, billingMonth: Date) {
    return this.prismaService.meterReading.findMany({
      where: {
        tenantId,
        contractId,
        roomId,
        billingMonth,
        status: 'CONFIRMED',
        invoiceItems: { none: {} },
      },
      orderBy: [{ meter: { type: 'asc' } }, { id: 'asc' }],
      select: {
        id: true,
        consumption: true,
        unitPrice: true,
        amount: true,
        previousValue: true,
        currentValue: true,
        meter: { select: { type: true, unit: true } },
      },
    })
  }

  findServiceAssignmentsForInvoice(
    tenantId: number,
    contractId: number,
    roomId: number,
    monthStart: Date,
    monthEnd: Date,
  ) {
    return this.prismaService.serviceAssignment.findMany({
      where: {
        tenantId,
        isActive: true,
        serviceItem: { isActive: true },
        OR: [{ contractId }, { roomId }],
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: monthEnd } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: monthStart } }] },
        ],
      },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        quantity: true,
        unitPrice: true,
        serviceItem: {
          select: { id: true, name: true, itemType: true, defaultUnitPrice: true, unitLabel: true },
        },
      },
    })
  }
  async isInvoiceCodeTaken(invoiceCode: string) {
    const invoice = await this.prismaService.invoice.findFirst({ where: { invoiceCode }, select: { id: true } })
    return Boolean(invoice)
  }

  async countSuccessfulPayments(invoiceId: number) {
    return this.prismaService.payment.count({ where: { invoiceId, status: 'SUCCESS' } })
  }

  /**
   * Creates invoice, item rows and the matching debt row atomically.
   */
  async createInvoiceWithItemsAndDebt(
    invoiceData: Prisma.InvoiceUncheckedCreateInput,
    items: InvoiceItemDraft[],
    debtStatus: DebtStatus,
  ) {
    return this.prismaService.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          ...invoiceData,
          items: { create: items },
        },
        select: {
          id: true,
          tenantId: true,
          contractId: true,
          roomId: true,
          renterId: true,
          billingMonth: true,
          dueDate: true,
          totalAmount: true,
          paidAmount: true,
          debtAmount: true,
        },
      })

      await tx.debt.create({
        data: {
          tenantId: invoice.tenantId,
          invoiceId: invoice.id,
          contractId: invoice.contractId,
          roomId: invoice.roomId,
          renterId: invoice.renterId,
          billingMonth: invoice.billingMonth,
          originalAmount: invoice.totalAmount,
          paidAmount: invoice.paidAmount,
          remainingAmount: invoice.debtAmount,
          dueDate: invoice.dueDate,
          status: debtStatus,
          resolvedAt: debtStatus === 'PAID' || debtStatus === 'CANCELED' ? new Date() : null,
        },
      })

      return tx.invoice.findUniqueOrThrow({ where: { id: invoice.id }, select: invoiceSelect })
    })
  }

  /**
   * Replaces editable draft items and keeps the debt snapshot aligned with invoice totals.
   */
  async updateDraftInvoiceWithDebt(
    id: number,
    invoiceData: Prisma.InvoiceUncheckedUpdateInput,
    items: InvoiceItemDraft[],
    totals: InvoiceTotals,
  ) {
    return this.prismaService.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } })
      await tx.invoice.update({
        where: { id },
        data: {
          ...invoiceData,
          ...totals,
          items: { create: items },
        },
      })
      await tx.debt.update({
        where: { invoiceId: id },
        data: {
          originalAmount: totals.totalAmount,
          paidAmount: totals.paidAmount,
          remainingAmount: totals.debtAmount,
          dueDate: invoiceData.dueDate as Date | undefined,
          status: 'OPEN',
          resolvedAt: null,
        },
      })
      return tx.invoice.findUniqueOrThrow({ where: { id }, select: invoiceSelect })
    })
  }

  async updateInvoiceAndDebtStatus(id: number, invoiceStatus: InvoiceStatus, debtStatus: DebtStatus, actorId: number) {
    return this.prismaService.$transaction(async (tx) => {
      await tx.invoice.update({ where: { id }, data: { status: invoiceStatus, updatedById: actorId } })
      await tx.debt.update({
        where: { invoiceId: id },
        data: {
          status: debtStatus,
          resolvedAt: debtStatus === 'PAID' || debtStatus === 'CANCELED' ? new Date() : null,
        },
      })
      return tx.invoice.findUniqueOrThrow({ where: { id }, select: invoiceSelect })
    })
  }
}
