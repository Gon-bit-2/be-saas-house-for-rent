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
      contract: { count: jest.fn() },
      invoice: { aggregate: jest.fn(), findMany: jest.fn() },
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
})
