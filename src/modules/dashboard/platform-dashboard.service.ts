import { BadRequestException, Injectable } from '@nestjs/common'
import type {
  PlatformDashboardGroupBy,
  TPlatformDashboardSummaryQuerySchema,
  TPlatformDashboardTrendsQuerySchema,
} from './model/platform-dashboard.model'
import { PlatformDashboardRepository } from './repositories/platform-dashboard.repo'

const DAY_MS = 24 * 60 * 60 * 1000

@Injectable()
export class PlatformDashboardService {
  constructor(private readonly repository: PlatformDashboardRepository) {}

  async getSummary(query: TPlatformDashboardSummaryQuerySchema) {
    const range = this.normalizeRange(query)
    const generatedAt = new Date()
    const data = await this.repository.getSummary(range.from, range.to, generatedAt)
    const occupiedRooms = this.count(data.rooms.byStatus, 'OCCUPIED')

    return {
      generatedAt: generatedAt.toISOString(),
      range: this.serializeRange(range),
      users: this.formatStatusSummary(data.users),
      landlords: this.formatStatusSummary(data.landlords),
      tenants: { ...this.formatStatusSummary(data.tenants), verified: data.tenants.verified },
      properties: this.formatStatusSummary(data.properties),
      rooms: {
        ...this.formatStatusSummary(data.rooms),
        occupancyRate: data.rooms.total === 0 ? 0 : Number(((occupiedRooms / data.rooms.total) * 100).toFixed(2)),
      },
      marketplace: {
        ...this.statusObject(data.marketplace.byStatus),
        publishedInRange: data.marketplace.publishedInRange,
      },
      subscriptions: data.subscriptions,
    }
  }

  async getTrends(query: TPlatformDashboardTrendsQuerySchema) {
    const range = this.normalizeRange(query)
    const groupBy = query.groupBy ?? this.inferGroupBy(range.from, range.to)
    const items = await this.repository.getTrends(range.from, range.to, groupBy)
    return {
      generatedAt: new Date().toISOString(),
      range: this.serializeRange(range),
      groupBy,
      items: items.map((item) => ({ ...item, bucket: item.bucket.toISOString() })),
    }
  }

  normalizeRange(query: { from?: Date; to?: Date }) {
    const now = new Date()
    const from = query.from
      ? this.startOfUtcDay(query.from)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const to = query.to ? this.endOfUtcDay(query.to) : this.endOfUtcDay(now)
    if (from.getTime() > to.getTime()) {
      throw new BadRequestException('Khoảng thời gian dashboard không hợp lệ')
    }
    if (to.getTime() - from.getTime() > 366 * DAY_MS) {
      throw new BadRequestException('Khoảng thời gian dashboard không được vượt quá 366 ngày')
    }
    return { from, to }
  }

  private formatStatusSummary(input: {
    total: number
    byStatus: Array<{ status: string; _count: { _all: number } }>
    newInRange?: number
  }) {
    return {
      total: input.total,
      ...this.statusObject(input.byStatus),
      ...(input.newInRange === undefined ? {} : { newInRange: input.newInRange }),
    }
  }

  private statusObject(rows: Array<{ status?: string; marketplaceStatus?: string; _count: { _all: number } }>) {
    return Object.fromEntries(rows.map((row) => [row.status ?? row.marketplaceStatus ?? 'UNKNOWN', row._count._all]))
  }

  private count(rows: Array<{ status: string; _count: { _all: number } }>, status: string) {
    return rows.find((row) => row.status === status)?._count._all ?? 0
  }

  private inferGroupBy(from: Date, to: Date): PlatformDashboardGroupBy {
    const days = Math.floor((to.getTime() - from.getTime()) / DAY_MS) + 1
    return days <= 62 ? 'day' : 'month'
  }

  private serializeRange(range: { from: Date; to: Date }) {
    return { from: range.from.toISOString(), to: range.to.toISOString() }
  }

  private startOfUtcDay(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  }

  private endOfUtcDay(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999))
  }
}
