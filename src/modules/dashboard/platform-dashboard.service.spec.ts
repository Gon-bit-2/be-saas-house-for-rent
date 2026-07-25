import { BadRequestException } from '@nestjs/common'

jest.mock('./repositories/platform-dashboard.repo', () => ({
  PlatformDashboardRepository: class PlatformDashboardRepository {},
}))
const { PlatformDashboardService } =
  require('./platform-dashboard.service') as typeof import('./platform-dashboard.service')

describe('PlatformDashboardService', () => {
  let service: import('./platform-dashboard.service').PlatformDashboardService
  let repository: Record<string, jest.Mock>

  beforeEach(() => {
    repository = { getSummary: jest.fn(), getTrends: jest.fn() }
    service = new PlatformDashboardService(repository as never)
  })

  it('formats global status metrics and occupancy rate', async () => {
    repository.getSummary.mockResolvedValue({
      users: { total: 10, byStatus: [{ status: 'ACTIVE', _count: { _all: 8 } }], newInRange: 2 },
      landlords: { total: 3, byStatus: [{ status: 'INACTIVE', _count: { _all: 1 } }], newInRange: 1 },
      tenants: { total: 3, byStatus: [{ status: 'ACTIVE', _count: { _all: 2 } }], verified: 2, newInRange: 1 },
      properties: { total: 4, byStatus: [{ status: 'ACTIVE', _count: { _all: 4 } }] },
      rooms: {
        total: 4,
        byStatus: [
          { status: 'OCCUPIED', _count: { _all: 3 } },
          { status: 'AVAILABLE', _count: { _all: 1 } },
        ],
        newInRange: 1,
      },
      marketplace: { byStatus: [{ marketplaceStatus: 'PUBLISHED', _count: { _all: 2 } }], publishedInRange: 1 },
      subscriptions: { active: 3, expiringWithin30Days: 1, byPlan: [] },
    })

    const result = await service.getSummary({
      from: new Date('2026-07-01T00:00:00.000Z'),
      to: new Date('2026-07-31T00:00:00.000Z'),
    })

    expect(result.rooms.occupancyRate).toBe(75)
    expect(result.users).toEqual(expect.objectContaining({ total: 10, ACTIVE: 8, newInRange: 2 }))
    expect(result.marketplace).toEqual({ PUBLISHED: 2, publishedInRange: 1 })
  })

  it('returns empty aggregates as zero-rate data', async () => {
    repository.getSummary.mockResolvedValue({
      users: { total: 0, byStatus: [], newInRange: 0 },
      landlords: { total: 0, byStatus: [], newInRange: 0 },
      tenants: { total: 0, byStatus: [], verified: 0, newInRange: 0 },
      properties: { total: 0, byStatus: [] },
      rooms: { total: 0, byStatus: [], newInRange: 0 },
      marketplace: { byStatus: [], publishedInRange: 0 },
      subscriptions: { active: 0, expiringWithin30Days: 0, byPlan: [] },
    })

    const result = await service.getSummary({})

    expect(result.rooms.occupancyRate).toBe(0)
    expect(result.subscriptions.active).toBe(0)
  })

  it('rejects an inverted or overlong date range', () => {
    expect(() =>
      service.normalizeRange({ from: new Date('2026-07-10T00:00:00.000Z'), to: new Date('2026-07-01T00:00:00.000Z') }),
    ).toThrow(BadRequestException)
    expect(() =>
      service.normalizeRange({ from: new Date('2025-01-01T00:00:00.000Z'), to: new Date('2026-07-01T00:00:00.000Z') }),
    ).toThrow(BadRequestException)
  })

  it('infers monthly trend buckets for ranges longer than 62 days', async () => {
    repository.getTrends.mockResolvedValue([])

    const result = await service.getTrends({
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-07-01T00:00:00.000Z'),
    })

    expect(result.groupBy).toBe('month')
    expect(repository.getTrends).toHaveBeenCalledWith(expect.any(Date), expect.any(Date), 'month')
  })
})
