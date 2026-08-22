import { Injectable } from '@nestjs/common'
import roleName from '@src/common/constants/role.constant'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import { Prisma } from 'generated/prisma/client'
import type { PlatformDashboardGroupBy } from '../model/platform-dashboard.model'

type TrendRow = {
  bucket: Date
  newUsers: number
  newLandlords: number
  newTenants: number
  newRooms: number
  publishedListings: number
}

@Injectable()
export class PlatformDashboardRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getSummary(from: Date, to: Date, now: Date) {
    const expiringTo = new Date(now)
    expiringTo.setUTCDate(expiringTo.getUTCDate() + 30)
    const landlordWhere = {
      deletedAt: null,
      tenantMembers: { some: { roleId: roleName.LANDLORD } },
    } satisfies Prisma.UserWhereInput

    const [
      totalUsers,
      usersByStatus,
      newUsers,
      totalLandlords,
      landlordsByStatus,
      newLandlords,
      totalTenants,
      tenantsByStatus,
      verifiedTenants,
      newTenants,
      totalProperties,
      propertiesByStatus,
      totalRooms,
      roomsByStatus,
      newRooms,
      marketplaceByStatus,
      publishedInRange,
      activeSubscriptions,
      expiringSubscriptions,
      subscriptionsByPlan,
    ] = await Promise.all([
      this.prismaService.user.count({ where: { deletedAt: null } }),
      this.prismaService.user.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prismaService.user.count({ where: { deletedAt: null, createdAt: { gte: from, lte: to } } }),
      this.prismaService.user.count({ where: landlordWhere }),
      this.prismaService.user.groupBy({
        by: ['status'],
        where: landlordWhere,
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prismaService.user.count({ where: { ...landlordWhere, createdAt: { gte: from, lte: to } } }),
      this.prismaService.tenant.count({ where: { deletedAt: null } }),
      this.prismaService.tenant.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prismaService.tenant.count({ where: { deletedAt: null, verificationStatus: 'VERIFIED' } }),
      this.prismaService.tenant.count({ where: { deletedAt: null, createdAt: { gte: from, lte: to } } }),
      this.prismaService.property.count({ where: { deletedAt: null } }),
      this.prismaService.property.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prismaService.room.count({ where: { deletedAt: null } }),
      this.prismaService.room.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prismaService.room.count({ where: { deletedAt: null, createdAt: { gte: from, lte: to } } }),
      this.prismaService.room.groupBy({
        by: ['marketplaceStatus'],
        where: { deletedAt: null },
        orderBy: { marketplaceStatus: 'asc' },
        _count: { _all: true },
      }),
      this.prismaService.room.count({
        where: { deletedAt: null, publishedAt: { gte: from, lte: to } },
      }),
      this.prismaService.subscription.count({
        where: { status: 'ACTIVE', tenant: { deletedAt: null } },
      }),
      this.prismaService.subscription.count({
        where: { status: 'ACTIVE', expiredAt: { gte: now, lte: expiringTo }, tenant: { deletedAt: null } },
      }),
      this.prismaService.subscription.groupBy({
        by: ['planId'],
        where: { status: 'ACTIVE', tenant: { deletedAt: null } },
        orderBy: { planId: 'asc' },
        _count: { _all: true },
      }),
    ])

    const plans = await this.prismaService.plan.findMany({
      where: { id: { in: subscriptionsByPlan.map((item) => item.planId) } },
      select: { id: true, code: true, name: true },
    })
    const planById = new Map(plans.map((plan) => [plan.id, plan]))

    return {
      users: { total: totalUsers, byStatus: this.normalizeStatus(usersByStatus), newInRange: newUsers },
      landlords: { total: totalLandlords, byStatus: this.normalizeStatus(landlordsByStatus), newInRange: newLandlords },
      tenants: {
        total: totalTenants,
        byStatus: this.normalizeStatus(tenantsByStatus),
        verified: verifiedTenants,
        newInRange: newTenants,
      },
      properties: { total: totalProperties, byStatus: this.normalizeStatus(propertiesByStatus) },
      rooms: { total: totalRooms, byStatus: this.normalizeStatus(roomsByStatus), newInRange: newRooms },
      marketplace: {
        byStatus: marketplaceByStatus.map((item) => ({
          marketplaceStatus: item.marketplaceStatus,
          _count: { _all: this.countAll(item._count) },
        })),
        publishedInRange,
      },
      subscriptions: {
        active: activeSubscriptions,
        expiringWithin30Days: expiringSubscriptions,
        byPlan: subscriptionsByPlan.map((item) => ({
          planId: item.planId,
          code: planById.get(item.planId)?.code ?? null,
          name: planById.get(item.planId)?.name ?? null,
          total: this.countAll(item._count),
        })),
      },
    }
  }

  async getTrends(from: Date, to: Date, groupBy: PlatformDashboardGroupBy) {
    const unit = groupBy === 'month' ? 'month' : 'day'
    const interval = groupBy === 'month' ? '1 month' : '1 day'
    return this.prismaService.$queryRaw<TrendRow[]>(Prisma.sql`
      WITH buckets AS (
        SELECT generate_series(
          date_trunc(${unit}, ${from}::timestamptz),
          date_trunc(${unit}, ${to}::timestamptz),
          ${interval}::interval
        )::timestamptz AS bucket
      ),
      user_counts AS (
        SELECT date_trunc(${unit}, "created_at") AS bucket, COUNT(*)::int AS total
        FROM "users"
        WHERE "deleted_at" IS NULL AND "created_at" BETWEEN ${from} AND ${to}
        GROUP BY 1
      ),
      landlord_counts AS (
        SELECT date_trunc(${unit}, u."created_at") AS bucket, COUNT(DISTINCT u."id")::int AS total
        FROM "users" u
        JOIN "tenant_members" tm ON tm."user_id" = u."id" AND tm."role_id" = ${roleName.LANDLORD}
        WHERE u."deleted_at" IS NULL AND u."created_at" BETWEEN ${from} AND ${to}
        GROUP BY 1
      ),
      tenant_counts AS (
        SELECT date_trunc(${unit}, "created_at") AS bucket, COUNT(*)::int AS total
        FROM "tenants"
        WHERE "deleted_at" IS NULL AND "created_at" BETWEEN ${from} AND ${to}
        GROUP BY 1
      ),
      room_counts AS (
        SELECT date_trunc(${unit}, "created_at") AS bucket, COUNT(*)::int AS total
        FROM "rooms"
        WHERE "deleted_at" IS NULL AND "created_at" BETWEEN ${from} AND ${to}
        GROUP BY 1
      ),
      listing_counts AS (
        SELECT date_trunc(${unit}, "published_at") AS bucket, COUNT(*)::int AS total
        FROM "rooms"
        WHERE "deleted_at" IS NULL AND "published_at" BETWEEN ${from} AND ${to}
        GROUP BY 1
      )
      SELECT b.bucket,
             COALESCE(u.total, 0)::int AS "newUsers",
             COALESCE(l.total, 0)::int AS "newLandlords",
             COALESCE(t.total, 0)::int AS "newTenants",
             COALESCE(r.total, 0)::int AS "newRooms",
             COALESCE(m.total, 0)::int AS "publishedListings"
      FROM buckets b
      LEFT JOIN user_counts u ON u.bucket = b.bucket
      LEFT JOIN landlord_counts l ON l.bucket = b.bucket
      LEFT JOIN tenant_counts t ON t.bucket = b.bucket
      LEFT JOIN room_counts r ON r.bucket = b.bucket
      LEFT JOIN listing_counts m ON m.bucket = b.bucket
      ORDER BY b.bucket ASC
    `)
  }

  private normalizeStatus<TStatus extends string>(rows: Array<{ status: TStatus; _count?: true | { _all?: number } }>) {
    return rows.map((item) => ({ status: item.status, _count: { _all: this.countAll(item._count) } }))
  }

  private countAll(value: true | { _all?: number } | undefined) {
    return typeof value === 'object' ? (value._all ?? 0) : 0
  }
}
