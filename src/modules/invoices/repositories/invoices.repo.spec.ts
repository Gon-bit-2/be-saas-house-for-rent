jest.mock('@src/shared/modules/database/prisma.service', () => ({ PrismaService: class PrismaService {} }))
const { InvoicesRepository } = require('./invoices.repo') as typeof import('./invoices.repo')

describe('InvoicesRepository', () => {
  it('splits active debt totals at UTC day and 30-day boundaries', async () => {
    const aggregate = jest
      .fn()
      .mockResolvedValueOnce({ _sum: { remainingAmount: '10000' } })
      .mockResolvedValueOnce({ _sum: { remainingAmount: '4000' } })
      .mockResolvedValueOnce({ _sum: { remainingAmount: '3000' } })
      .mockResolvedValueOnce({ _sum: { remainingAmount: '3000' } })
    const repository = new InvoicesRepository({ debt: { aggregate } } as never)
    const today = new Date('2026-07-16T00:00:00.000Z')

    const result = await repository.getDebtStats({ tenantId: 10 }, today)

    const activeDebtWhere = {
      tenantId: 10,
      propertyId: undefined,
      status: { notIn: ['PAID', 'CANCELED'] },
      remainingAmount: { gt: 0 },
    }
    expect(aggregate).toHaveBeenNthCalledWith(1, {
      where: { AND: [activeDebtWhere, {}] },
      _sum: { remainingAmount: true },
    })
    expect(aggregate).toHaveBeenNthCalledWith(2, {
      where: { AND: [activeDebtWhere, { dueDate: { lt: new Date('2026-06-16T00:00:00.000Z') } }] },
      _sum: { remainingAmount: true },
    })
    expect(aggregate).toHaveBeenNthCalledWith(3, {
      where: {
        AND: [
          activeDebtWhere,
          {
            dueDate: {
              gte: new Date('2026-06-16T00:00:00.000Z'),
              lt: new Date('2026-07-16T00:00:00.000Z'),
            },
          },
        ],
      },
      _sum: { remainingAmount: true },
    })
    expect(aggregate).toHaveBeenNthCalledWith(4, {
      where: { AND: [activeDebtWhere, { dueDate: { gte: new Date('2026-07-16T00:00:00.000Z') } }] },
      _sum: { remainingAmount: true },
    })
    expect(result).toEqual({
      totalOutstanding: '10000',
      overdueMoreThan30Days: '4000',
      overdueWithin30Days: '3000',
      currentNotDue: '3000',
    })
  })
})
