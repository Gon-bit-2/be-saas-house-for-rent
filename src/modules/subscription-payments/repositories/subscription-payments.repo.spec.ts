jest.mock('@src/shared/modules/database/prisma.service', () => ({
  PrismaService: class PrismaService {},
}))

const { SubscriptionPaymentsRepository } =
  require('./subscription-payments.repo') as typeof import('./subscription-payments.repo')

describe('SubscriptionPaymentsRepository.complete', () => {
  const paidAt = new Date('2024-02-29T10:00:00.000Z')

  function createPayment(overrides: Record<string, unknown> = {}) {
    return {
      id: 7,
      subscriptionId: 12,
      tenantId: 3,
      purpose: 'RENEWAL',
      status: 'PENDING',
      transactionCode: null,
      subscription: {
        id: 12,
        tenantId: 3,
        billingCycle: 'YEARLY',
        expiredAt: new Date('2024-01-31T10:00:00.000Z'),
      },
      ...overrides,
    }
  }

  function createSubject(payment = createPayment()) {
    const tx = {
      subscriptionPayment: {
        findFirst: jest.fn().mockResolvedValue(payment),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ ...payment, status: 'PAID', paidAt }),
      },
      subscription: {
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    }
    const prismaService = {
      $transaction: jest.fn(async (operation: (client: typeof tx) => unknown) => operation(tx)),
    }
    return {
      repository: new SubscriptionPaymentsRepository(prismaService as never),
      prismaService,
      tx,
    }
  }

  it('claims a renewal once and extends from the later paid date', async () => {
    const { repository, prismaService, tx } = createSubject()

    const result = await repository.complete({
      orderCode: 1000000007,
      paymentLinkId: 'link-7',
      transactionCode: 'ref-7',
      paidAt,
    })

    expect(result.outcome).toBe('PROCESSED')
    expect(tx.subscriptionPayment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 7, status: 'PENDING' } }),
    )
    expect(tx.subscription.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: { status: 'ACTIVE', expiredAt: new Date('2025-02-28T10:00:00.000Z') },
    })
    expect(prismaService.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    })
  })

  it('treats an already paid webhook as a duplicate without extending again', async () => {
    const { repository, tx } = createSubject(createPayment({ status: 'PAID', transactionCode: 'ref-7' }))

    const result = await repository.complete({
      orderCode: 1000000007,
      paymentLinkId: 'link-7',
      transactionCode: 'ref-7',
      paidAt,
    })

    expect(result.outcome).toBe('DUPLICATE')
    expect(tx.subscriptionPayment.updateMany).not.toHaveBeenCalled()
    expect(tx.subscription.update).not.toHaveBeenCalled()
  })

  it('cancels the old active subscription before activating a plan change', async () => {
    const payment = createPayment({
      purpose: 'PLAN_CHANGE',
      subscription: {
        id: 12,
        tenantId: 3,
        billingCycle: 'MONTHLY',
        expiredAt: new Date('2024-03-29T10:00:00.000Z'),
      },
    })
    const { repository, tx } = createSubject(payment)

    const result = await repository.complete({
      orderCode: 1000000007,
      paymentLinkId: 'link-7',
      transactionCode: 'ref-7',
      paidAt,
    })

    expect(result.outcome).toBe('PROCESSED')
    expect(tx.subscription.updateMany).toHaveBeenNthCalledWith(1, {
      where: { tenantId: 3, status: 'ACTIVE', id: { not: 12 } },
      data: { status: 'CANCELED', autoRenew: false },
    })
    expect(tx.subscription.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: 12, tenantId: 3, status: 'PENDING' },
      data: {
        status: 'ACTIVE',
        startedAt: paidAt,
        expiredAt: new Date('2024-03-29T10:00:00.000Z'),
      },
    })
  })
})

describe('SubscriptionPaymentsRepository.findCurrent', () => {
  it('prefers an active subscription over older lifecycle states', async () => {
    const active = { id: 15, tenantId: 3, status: 'ACTIVE' }
    const prismaService = {
      subscription: { findFirst: jest.fn().mockResolvedValue(active) },
    }
    const repository = new SubscriptionPaymentsRepository(prismaService as never)

    await expect(repository.findCurrent(3)).resolves.toBe(active)
    expect(prismaService.subscription.findFirst).toHaveBeenCalledTimes(1)
    expect(prismaService.subscription.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 3, status: 'ACTIVE' } }),
    )
  })

  it('falls back to past due and then expired subscriptions', async () => {
    const expired = { id: 13, tenantId: 3, status: 'EXPIRED' }
    const prismaService = {
      subscription: {
        findFirst: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(expired),
      },
    }
    const repository = new SubscriptionPaymentsRepository(prismaService as never)

    await expect(repository.findCurrent(3)).resolves.toBe(expired)
    expect(prismaService.subscription.findFirst.mock.calls.map(([input]) => input.where.status)).toEqual([
      'ACTIVE',
      'PAST_DUE',
      'EXPIRED',
    ])
  })
})
