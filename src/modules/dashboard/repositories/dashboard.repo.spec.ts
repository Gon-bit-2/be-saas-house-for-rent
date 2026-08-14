jest.mock('@src/shared/modules/database/prisma.service', () => ({ PrismaService: class PrismaService {} }))
jest.mock('generated/prisma/client', () => ({
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
  },
}))
const { DashboardRepository } = require('./dashboard.repo') as typeof import('./dashboard.repo')

describe('DashboardRepository', () => {
  let repository: import('./dashboard.repo').DashboardRepository
  let prismaService: Record<string, any>

  beforeEach(() => {
    prismaService = {
      $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
      $queryRaw: jest.fn(),
      room: { count: jest.fn(), groupBy: jest.fn() },
      rentalRequest: { count: jest.fn(), findMany: jest.fn() },
      contract: { count: jest.fn(), findMany: jest.fn() },
      invoice: { count: jest.fn(), aggregate: jest.fn(), findMany: jest.fn() },
      payment: { aggregate: jest.fn(), findMany: jest.fn() },
      debt: { aggregate: jest.fn() },
      ticket: { count: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() },
    }
    repository = new DashboardRepository(prismaService as never)
  })

  it('counts room stats by tenant and active room status', async () => {
    prismaService.room.count.mockResolvedValue(3)
    prismaService.room.groupBy.mockResolvedValue([{ status: 'OCCUPIED', _count: { _all: 2 } }])

    const result = await repository.getRoomStats(2)

    expect(prismaService.room.count).toHaveBeenCalledWith({ where: { tenantId: 2, deletedAt: null } })
    expect(prismaService.room.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ by: ['status'], where: { tenantId: 2, deletedAt: null }, _count: { _all: true } }),
    )
    expect(result.totalRooms).toBe(3)
  })

  it('uses only settled payment statuses and active debts in finance stats', async () => {
    prismaService.invoice.aggregate.mockResolvedValue({ _sum: { totalAmount: '5000' } })
    prismaService.payment.aggregate
      .mockResolvedValueOnce({ _sum: { amount: '3000' } })
      .mockResolvedValueOnce({ _sum: { amount: '1000' } })
    prismaService.debt.aggregate
      .mockResolvedValueOnce({ _sum: { remainingAmount: '2000' } })
      .mockResolvedValueOnce({ _sum: { remainingAmount: '500' } })

    await repository.getFinanceStats(2, new Date('2026-07-01T00:00:00.000Z'), new Date('2026-07-31T23:59:59.999Z'))

    expect(prismaService.invoice.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 2,
          status: { in: ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'] },
        }),
      }),
    )
    expect(prismaService.payment.aggregate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: expect.objectContaining({ tenantId: 2, status: 'SUCCESS' }) }),
    )
    expect(prismaService.payment.aggregate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: expect.objectContaining({ tenantId: 2, status: 'PENDING' }) }),
    )
    expect(prismaService.debt.aggregate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: { tenantId: 2, status: { in: ['OPEN', 'PARTIAL', 'OVERDUE'] } } }),
    )
  })

  it('counts ticket statuses and urgent open tickets', async () => {
    prismaService.ticket.groupBy.mockResolvedValue([{ status: 'OPEN', _count: { _all: 4 } }])
    prismaService.ticket.count.mockResolvedValue(2)

    const result = await repository.getTicketStats(
      2,
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-31T23:59:59.999Z'),
    )

    expect(prismaService.ticket.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['status'],
        where: expect.objectContaining({ tenantId: 2 }),
        _count: { _all: true },
      }),
    )
    expect(prismaService.ticket.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 2, priority: 'URGENT', status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_RENTER'] } },
      }),
    )
    expect(result.urgentOpenTickets).toBe(2)
  })

  it('loads tenant-scoped action-center totals and limits each preview to five items', async () => {
    prismaService.rentalRequest.count.mockResolvedValue(7)
    prismaService.rentalRequest.findMany.mockResolvedValue([{ id: 1 }])
    prismaService.contract.count.mockResolvedValue(2)
    prismaService.contract.findMany.mockResolvedValue([{ id: 2 }])
    prismaService.invoice.count.mockResolvedValue(3)
    prismaService.invoice.findMany.mockResolvedValue([{ id: 3 }])
    prismaService.ticket.count.mockResolvedValue(4)
    prismaService.ticket.findMany.mockResolvedValue([{ id: 4 }])

    const result = await repository.getActionCenter(2, new Date('2026-07-16T10:30:00.000Z'))

    expect(prismaService.rentalRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 2, status: 'PENDING' }, take: 5 }),
    )
    expect(prismaService.contract.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 2, status: 'ACTIVE', deletedAt: null }),
        take: 5,
        orderBy: [{ endDate: 'asc' }, { id: 'asc' }],
      }),
    )
    expect(prismaService.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 2,
          status: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
          debtAmount: { gt: 0 },
        }),
        take: 5,
      }),
    )
    expect(prismaService.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 2, status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_RENTER'] } },
        take: 5,
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
      }),
    )
    expect(result).toEqual({
      pendingRequests: { total: 7, items: [{ id: 1 }] },
      expiringContracts: { total: 2, items: [{ id: 2 }] },
      unpaidInvoices: { total: 3, items: [{ id: 3 }] },
      openTickets: { total: 4, items: [{ id: 4 }] },
    })
  })
})
