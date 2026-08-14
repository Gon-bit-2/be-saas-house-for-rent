import { BadRequestException, Injectable } from '@nestjs/common'
import { TenantAccessService } from '@src/shared/modules/services/tenant-access.service'
import type {
  DashboardTrendGroupBy,
  TDashboardSummaryQuerySchema,
  TRecentActivityQuerySchema,
  TRevenueTrendQuerySchema,
} from './model/dashboard.model'
import { DashboardRepository, StatusCountRow } from './repositories/dashboard.repo'

const DAY_MS = 24 * 60 * 60 * 1000

@Injectable()
export class DashboardService {
  constructor(
    private readonly dashboardRepository: DashboardRepository,
    private readonly tenantAccessService: TenantAccessService,
  ) {}

  async getSummary(userId: number, query: TDashboardSummaryQuerySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const range = this.normalizeRange(query)
    const now = new Date()

    const [roomStats, contractStats, financeStats, ticketStats] = await Promise.all([
      this.dashboardRepository.getRoomStats(tenant.tenantId),
      this.dashboardRepository.getContractStats(tenant.tenantId, now),
      this.dashboardRepository.getFinanceStats(tenant.tenantId, range.from, range.to),
      this.dashboardRepository.getTicketStats(tenant.tenantId, range.from, range.to),
    ])

    return {
      tenantId: tenant.tenantId,
      range: this.serializeRange(range),
      rooms: this.formatRoomStats(roomStats),
      contracts: contractStats,
      finance: {
        invoiceTotal: this.toNumber(financeStats.invoiceTotal),
        paidAmount: this.toNumber(financeStats.paidAmount),
        pendingPaymentAmount: this.toNumber(financeStats.pendingPaymentAmount),
        outstandingDebt: this.toNumber(financeStats.outstandingDebt),
        overdueDebt: this.toNumber(financeStats.overdueDebt),
      },
      tickets: this.formatTicketStats(ticketStats),
    }
  }

  async getActionCenter(userId: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const now = new Date()
    const actionCenter = await this.dashboardRepository.getActionCenter(tenant.tenantId, now)
    const today = this.startOfUtcDay(now)

    return {
      tenantId: tenant.tenantId,
      pendingRequests: actionCenter.pendingRequests,
      expiringContracts: actionCenter.expiringContracts,
      unpaidInvoices: {
        total: actionCenter.unpaidInvoices.total,
        items: actionCenter.unpaidInvoices.items.map((invoice) => ({
          ...invoice,
          debtAmount: this.toNumber(invoice.debtAmount),
          daysOverdue: this.daysOverdue(invoice.dueDate, today),
        })),
      },
      openTickets: actionCenter.openTickets,
    }
  }

  async getRevenueTrend(userId: number, query: TRevenueTrendQuerySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const range = this.normalizeRange(query)
    const groupBy = query.groupBy ?? this.inferTrendGroupBy(range.from, range.to)
    const rows = await this.dashboardRepository.getRevenueTrend(tenant.tenantId, range.from, range.to, groupBy)

    return {
      tenantId: tenant.tenantId,
      range: this.serializeRange(range),
      groupBy,
      items: rows.map((row) => ({
        bucket: row.bucket.toISOString(),
        amount: this.toNumber(row.amount),
        count: Number(row.count),
      })),
    }
  }

  async getRecentActivities(userId: number, query: TRecentActivityQuerySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const activities = await this.dashboardRepository.getRecentActivities(tenant.tenantId, query.limit)
    return {
      tenantId: tenant.tenantId,
      items: activities.map((activity) => ({
        ...activity,
        occurredAt: activity.occurredAt.toISOString(),
      })),
    }
  }

  normalizeRange(query: TDashboardSummaryQuerySchema) {
    const now = new Date()
    const from = query.from
      ? this.startOfUtcDay(query.from)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const to = query.to ? this.endOfUtcDay(query.to) : this.endOfUtcDay(now)

    if (from.getTime() > to.getTime()) {
      throw new BadRequestException('Khoảng thời gian dashboard không hợp lệ')
    }

    return { from, to }
  }

  private formatRoomStats(input: { totalRooms: number; byStatus: StatusCountRow<string>[] }) {
    const occupiedRooms = this.countStatus(input.byStatus, 'OCCUPIED')
    return {
      totalRooms: input.totalRooms,
      occupiedRooms,
      availableRooms: this.countStatus(input.byStatus, 'AVAILABLE'),
      maintenanceRooms: this.countStatus(input.byStatus, 'MAINTENANCE'),
      occupancyRate: input.totalRooms === 0 ? 0 : Number(((occupiedRooms / input.totalRooms) * 100).toFixed(2)),
    }
  }

  private formatTicketStats(input: { byStatus: StatusCountRow<string>[]; urgentOpenTickets: number }) {
    return {
      open: this.countStatus(input.byStatus, 'OPEN'),
      inProgress: this.countStatus(input.byStatus, 'IN_PROGRESS'),
      waitingRenter: this.countStatus(input.byStatus, 'WAITING_RENTER'),
      resolved: this.countStatus(input.byStatus, 'RESOLVED'),
      closed: this.countStatus(input.byStatus, 'CLOSED'),
      urgentOpenTickets: input.urgentOpenTickets,
    }
  }

  private countStatus(rows: StatusCountRow<string>[], status: string) {
    return rows.find((row) => row.status === status)?._count._all ?? 0
  }

  private inferTrendGroupBy(from: Date, to: Date): DashboardTrendGroupBy {
    const days = Math.floor((to.getTime() - from.getTime()) / DAY_MS) + 1
    return days <= 62 ? 'day' : 'month'
  }

  private serializeRange(range: { from: Date; to: Date }) {
    return { from: range.from.toISOString(), to: range.to.toISOString() }
  }

  private toNumber(value: unknown) {
    if (value === null || value === undefined) {
      return 0
    }
    return Number(value)
  }

  private daysOverdue(dueDate: Date, today: Date) {
    return Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / DAY_MS))
  }

  private startOfUtcDay(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  }

  private endOfUtcDay(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999))
  }
}
