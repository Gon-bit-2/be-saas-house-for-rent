import { BadRequestException } from '@nestjs/common'
jest.mock('@src/shared/modules/services/tenant-access.service', () => ({
  TenantAccessService: class TenantAccessService {},
}))
jest.mock('./repositories/dashboard.repo', () => ({ DashboardRepository: class DashboardRepository {} }))
const { DashboardService } = require('./dashboard.service') as typeof import('./dashboard.service')

describe('DashboardService', () => {
  let service: import('./dashboard.service').DashboardService
  let dashboardRepository: Record<string, jest.Mock>
  let tenantAccessService: Record<string, jest.Mock>

  beforeEach(() => {
    dashboardRepository = {
      getRoomStats: jest.fn(),
      getContractStats: jest.fn(),
      getFinanceStats: jest.fn(),
      getTicketStats: jest.fn(),
      getRevenueTrend: jest.fn(),
      getRecentActivities: jest.fn(),
    }
    tenantAccessService = {
      getActiveTenantContext: jest.fn().mockResolvedValue({ tenantId: 2, userId: 99, memberId: 1, roleId: 'LANDLORD' }),
    }
    service = new DashboardService(dashboardRepository as never, tenantAccessService as never)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('builds summary metrics from repository aggregates', async () => {
    dashboardRepository.getRoomStats.mockResolvedValue({
      totalRooms: 4,
      byStatus: [
        { status: 'OCCUPIED', _count: { _all: 2 } },
        { status: 'AVAILABLE', _count: { _all: 1 } },
        { status: 'MAINTENANCE', _count: { _all: 1 } },
      ],
    })
    dashboardRepository.getContractStats.mockResolvedValue({ activeContracts: 2, endingSoonContracts: 1 })
    dashboardRepository.getFinanceStats.mockResolvedValue({
      invoiceTotal: '5000000',
      paidAmount: '3500000',
      pendingPaymentAmount: null,
      outstandingDebt: '1500000',
      overdueDebt: '500000',
    })
    dashboardRepository.getTicketStats.mockResolvedValue({
      byStatus: [
        { status: 'OPEN', _count: { _all: 3 } },
        { status: 'IN_PROGRESS', _count: { _all: 2 } },
        { status: 'CLOSED', _count: { _all: 1 } },
      ],
      urgentOpenTickets: 1,
    })

    const result = await service.getSummary(99, {
      from: new Date('2026-07-01T12:00:00.000Z'),
      to: new Date('2026-07-16T12:00:00.000Z'),
    })

    expect(tenantAccessService.getActiveTenantContext).toHaveBeenCalledWith(99)
    expect(result.rooms).toEqual({
      totalRooms: 4,
      occupiedRooms: 2,
      availableRooms: 1,
      maintenanceRooms: 1,
      occupancyRate: 50,
    })
    expect(result.finance).toEqual({
      invoiceTotal: 5000000,
      paidAmount: 3500000,
      pendingPaymentAmount: 0,
      outstandingDebt: 1500000,
      overdueDebt: 500000,
    })
    expect(result.tickets).toEqual({
      open: 3,
      inProgress: 2,
      waitingRenter: 0,
      resolved: 0,
      closed: 1,
      urgentOpenTickets: 1,
    })
  })

  it('defaults summary range to current UTC month through current UTC day', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-16T10:30:00.000Z'))
    dashboardRepository.getRoomStats.mockResolvedValue({ totalRooms: 0, byStatus: [] })
    dashboardRepository.getContractStats.mockResolvedValue({ activeContracts: 0, endingSoonContracts: 0 })
    dashboardRepository.getFinanceStats.mockResolvedValue({
      invoiceTotal: null,
      paidAmount: null,
      pendingPaymentAmount: null,
      outstandingDebt: null,
      overdueDebt: null,
    })
    dashboardRepository.getTicketStats.mockResolvedValue({ byStatus: [], urgentOpenTickets: 0 })

    await service.getSummary(99, {})

    expect(dashboardRepository.getFinanceStats).toHaveBeenCalledWith(
      2,
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-16T23:59:59.999Z'),
    )
  })

  it('rejects an invalid date range', () => {
    expect(() =>
      service.normalizeRange({ from: new Date('2026-08-01T00:00:00.000Z'), to: new Date('2026-07-01T00:00:00.000Z') }),
    ).toThrow(BadRequestException)
  })

  it('infers monthly revenue grouping for long ranges', async () => {
    dashboardRepository.getRevenueTrend.mockResolvedValue([
      { bucket: new Date('2026-01-01T00:00:00.000Z'), amount: '1000', count: 2 },
    ])

    const result = await service.getRevenueTrend(99, {
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-07-16T00:00:00.000Z'),
    })

    expect(dashboardRepository.getRevenueTrend).toHaveBeenCalledWith(2, expect.any(Date), expect.any(Date), 'month')
    expect(result.items).toEqual([{ bucket: '2026-01-01T00:00:00.000Z', amount: 1000, count: 2 }])
  })
})
