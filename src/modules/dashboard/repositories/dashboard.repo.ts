import { Injectable } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import { Prisma } from 'generated/prisma/client'
import type { DashboardTrendGroupBy } from '../model/dashboard.model'

export type StatusCountRow<TStatus extends string> = {
  status: TStatus
  _count: { _all: number }
}

export type DashboardActivity = {
  type: 'INVOICE' | 'PAYMENT' | 'TICKET'
  id: number
  title: string
  description: string
  status: string
  occurredAt: Date
  metadata: Record<string, string | number | null>
}

type RevenueTrendRow = {
  bucket: Date
  amount: unknown
  count: number
}

@Injectable()
export class DashboardRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getRoomStats(tenantId: number) {
    const [totalRooms, byStatus] = await this.prismaService.$transaction([
      this.prismaService.room.count({ where: { tenantId, deletedAt: null } }),
      this.prismaService.room.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
    ])

    return { totalRooms, byStatus: this.normalizeStatusCounts(byStatus) }
  }

  async getContractStats(tenantId: number, now: Date) {
    const endingSoonTo = new Date(now)
    endingSoonTo.setUTCDate(endingSoonTo.getUTCDate() + 30)

    const [activeContracts, endingSoonContracts] = await this.prismaService.$transaction([
      this.prismaService.contract.count({ where: { tenantId, status: 'ACTIVE', deletedAt: null } }),
      this.prismaService.contract.count({
        where: {
          tenantId,
          status: 'ACTIVE',
          deletedAt: null,
          endDate: { gte: this.startOfUtcDay(now), lte: this.endOfUtcDay(endingSoonTo) },
        },
      }),
    ])

    return { activeContracts, endingSoonContracts }
  }

  async getFinanceStats(tenantId: number, from: Date, to: Date) {
    const [invoiceTotal, paidAmount, pendingPaymentAmount, outstandingDebt, overdueDebt] =
      await this.prismaService.$transaction([
        this.prismaService.invoice.aggregate({
          where: {
            tenantId,
            deletedAt: null,
            status: { in: ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'] },
            billingMonth: { gte: from, lte: to },
          },
          _sum: { totalAmount: true },
        }),
        this.prismaService.payment.aggregate({
          where: { tenantId, status: 'SUCCESS', paidAt: { gte: from, lte: to } },
          _sum: { amount: true },
        }),
        this.prismaService.payment.aggregate({
          where: { tenantId, status: 'PENDING', createdAt: { gte: from, lte: to } },
          _sum: { amount: true },
        }),
        this.prismaService.debt.aggregate({
          where: { tenantId, status: { in: ['OPEN', 'PARTIAL', 'OVERDUE'] } },
          _sum: { remainingAmount: true },
        }),
        this.prismaService.debt.aggregate({
          where: { tenantId, status: 'OVERDUE' },
          _sum: { remainingAmount: true },
        }),
      ])

    return {
      invoiceTotal: invoiceTotal._sum.totalAmount,
      paidAmount: paidAmount._sum.amount,
      pendingPaymentAmount: pendingPaymentAmount._sum.amount,
      outstandingDebt: outstandingDebt._sum.remainingAmount,
      overdueDebt: overdueDebt._sum.remainingAmount,
    }
  }

  async getTicketStats(tenantId: number, from: Date, to: Date) {
    const [byStatus, urgentOpenTickets] = await this.prismaService.$transaction([
      this.prismaService.ticket.groupBy({
        by: ['status'],
        where: { tenantId, createdAt: { gte: from, lte: to } },
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prismaService.ticket.count({
        where: {
          tenantId,
          priority: 'URGENT',
          status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_RENTER'] },
        },
      }),
    ])

    return { byStatus: this.normalizeStatusCounts(byStatus), urgentOpenTickets }
  }

  async getRevenueTrend(tenantId: number, from: Date, to: Date, groupBy: DashboardTrendGroupBy) {
    if (groupBy === 'month') {
      return this.prismaService.$queryRaw<RevenueTrendRow[]>(Prisma.sql`
        SELECT date_trunc('month', "paid_at")::timestamptz AS "bucket",
               COALESCE(SUM("amount"), 0) AS "amount",
               COUNT(*)::int AS "count"
        FROM "payments"
        WHERE "tenant_id" = ${tenantId}
          AND "status" = 'SUCCESS'
          AND "paid_at" IS NOT NULL
          AND "paid_at" >= ${from}
          AND "paid_at" <= ${to}
        GROUP BY 1
        ORDER BY 1 ASC
      `)
    }

    return this.prismaService.$queryRaw<RevenueTrendRow[]>(Prisma.sql`
      SELECT date_trunc('day', "paid_at")::timestamptz AS "bucket",
             COALESCE(SUM("amount"), 0) AS "amount",
             COUNT(*)::int AS "count"
      FROM "payments"
      WHERE "tenant_id" = ${tenantId}
        AND "status" = 'SUCCESS'
        AND "paid_at" IS NOT NULL
        AND "paid_at" >= ${from}
        AND "paid_at" <= ${to}
      GROUP BY 1
      ORDER BY 1 ASC
    `)
  }

  async getRecentActivities(tenantId: number, limit: number): Promise<DashboardActivity[]> {
    const [invoices, payments, tickets] = await this.prismaService.$transaction([
      this.prismaService.invoice.findMany({
        where: { tenantId, deletedAt: null, status: { not: 'DRAFT' } },
        take: limit,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          invoiceCode: true,
          status: true,
          totalAmount: true,
          updatedAt: true,
          room: { select: { id: true, roomCode: true, title: true } },
        },
      }),
      this.prismaService.payment.findMany({
        where: { tenantId },
        take: limit,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          status: true,
          amount: true,
          updatedAt: true,
          invoice: { select: { id: true, invoiceCode: true } },
          payer: { select: { id: true, fullName: true } },
        },
      }),
      this.prismaService.ticket.findMany({
        where: { tenantId },
        take: limit,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          updatedAt: true,
          room: { select: { id: true, roomCode: true } },
        },
      }),
    ])

    return [
      ...invoices.map((invoice) => ({
        type: 'INVOICE' as const,
        id: invoice.id,
        title: `Hóa đơn ${invoice.invoiceCode}`,
        description: `Trạng thái hóa đơn: ${invoice.status}`,
        status: invoice.status,
        occurredAt: invoice.updatedAt,
        metadata: {
          invoiceCode: invoice.invoiceCode,
          roomId: invoice.room.id,
          roomCode: invoice.room.roomCode,
          totalAmount: String(invoice.totalAmount),
        },
      })),
      ...payments.map((payment) => ({
        type: 'PAYMENT' as const,
        id: payment.id,
        title: `Thanh toán ${payment.invoice.invoiceCode}`,
        description: `${payment.payer.fullName} - ${payment.status}`,
        status: payment.status,
        occurredAt: payment.updatedAt,
        metadata: {
          invoiceId: payment.invoice.id,
          invoiceCode: payment.invoice.invoiceCode,
          payerId: payment.payer.id,
          amount: String(payment.amount),
        },
      })),
      ...tickets.map((ticket) => ({
        type: 'TICKET' as const,
        id: ticket.id,
        title: ticket.title,
        description: `Ticket ${ticket.status} - ${ticket.priority}`,
        status: ticket.status,
        occurredAt: ticket.updatedAt,
        metadata: {
          roomId: ticket.room.id,
          roomCode: ticket.room.roomCode,
          priority: ticket.priority,
        },
      })),
    ]
      .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
      .slice(0, limit)
  }

  private normalizeStatusCounts<TStatus extends string>(
    rows: Array<{ status: TStatus; _count?: true | { _all?: number } }>,
  ): StatusCountRow<TStatus>[] {
    return rows.map((row) => ({
      status: row.status,
      _count: { _all: typeof row._count === 'object' ? (row._count._all ?? 0) : 0 },
    }))
  }

  private startOfUtcDay(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  }

  private endOfUtcDay(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999))
  }
}
