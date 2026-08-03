import { BadRequestException, ConflictException } from '@nestjs/common'

jest.mock('@src/shared/modules/services/tenant-access.service', () => ({
  TenantAccessService: class TenantAccessService {},
}))
jest.mock('../payos/payos.service', () => ({ PayosService: class PayosService {} }))
jest.mock('./repositories/subscription-payments.repo', () => ({
  SubscriptionPaymentsRepository: class SubscriptionPaymentsRepository {},
}))
const { SubscriptionPaymentsService } =
  require('./subscription-payments.service') as typeof import('./subscription-payments.service')

describe('SubscriptionPaymentsService', () => {
  let service: import('./subscription-payments.service').SubscriptionPaymentsService
  let repository: Record<string, jest.Mock>
  let tenantAccessService: Record<string, jest.Mock>
  let payosService: Record<string, jest.Mock>

  beforeEach(() => {
    repository = {
      findOpen: jest.fn(),
      findCurrent: jest.fn(),
      findPlan: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      fail: jest.fn(),
      expire: jest.fn(),
      findByPayosIdentifiers: jest.fn(),
      complete: jest.fn(),
      findById: jest.fn(),
      cancel: jest.fn(),
      findManyAndCount: jest.fn(),
      hasOpen: jest.fn(),
    }
    tenantAccessService = {
      getActiveTenantContext: jest.fn().mockResolvedValue({ tenantId: 2, userId: 99, roleId: 'LANDLORD' }),
    }
    payosService = {
      createPaymentLink: jest.fn(),
      getPaymentLink: jest.fn(),
      cancelPaymentLink: jest.fn(),
    }
    service = new SubscriptionPaymentsService(repository as never, tenantAccessService as never, payosService as never)
    jest.useFakeTimers().setSystemTime(new Date('2026-07-26T00:00:00.000Z'))
  })

  afterEach(() => jest.useRealTimers())

  it('calculates the plan price and creates a PayOS checkout for a plan change', async () => {
    repository.findOpen.mockResolvedValue(null)
    repository.findPlan.mockResolvedValue({ id: 3, name: 'Pro', priceMonthly: 200000, priceYearly: 2000000 })
    repository.findCurrent.mockResolvedValue({ id: 1, planId: 1, billingCycle: 'MONTHLY' })
    repository.create.mockResolvedValue({ id: 7, tenantId: 2, orderCode: 1000000000 })
    payosService.createPaymentLink.mockResolvedValue({
      paymentLinkId: 'link-sub-7',
      checkoutUrl: 'https://pay.payos.vn/link-sub-7',
      qrCode: 'qr-content',
      status: 'PENDING',
    })
    repository.update.mockResolvedValue({ id: 7, paymentLinkId: 'link-sub-7' })

    const result = await service.createCheckout(99, { planId: 3, billingCycle: 'MONTHLY' })

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 2, planId: 3, purpose: 'PLAN_CHANGE', amount: 200000, actorId: 99 }),
    )
    expect(payosService.createPaymentLink).toHaveBeenCalledWith(
      expect.objectContaining({ orderCode: 1000000000, amount: 200000 }),
    )
    expect(result).toEqual({ id: 7, paymentLinkId: 'link-sub-7' })
  })

  it('reuses the same unexpired checkout and blocks a different request', async () => {
    const open = {
      id: 7,
      expiredAt: new Date('2026-07-26T00:10:00.000Z'),
      subscription: { planId: 3, billingCycle: 'MONTHLY' },
    }
    repository.findOpen.mockResolvedValue(open)

    await expect(service.createCheckout(99, { planId: 3, billingCycle: 'MONTHLY' })).resolves.toBe(open)
    await expect(service.createCheckout(99, { planId: 4, billingCycle: 'MONTHLY' })).rejects.toBeInstanceOf(
      ConflictException,
    )
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('rejects zero or fractional PayOS prices', async () => {
    repository.findOpen.mockResolvedValue(null)
    repository.findPlan.mockResolvedValue({ id: 3, name: 'Free', priceMonthly: 0, priceYearly: 0 })

    await expect(service.createCheckout(99, { planId: 3, billingCycle: 'MONTHLY' })).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })

  it('completes a matching subscription webhook', async () => {
    repository.findByPayosIdentifiers.mockResolvedValue({
      id: 7,
      tenantId: 2,
      amount: 200000,
      status: 'PENDING',
    })
    repository.complete.mockResolvedValue({ outcome: 'PROCESSED', payment: { id: 7, tenantId: 2 } })

    const result = await service.handlePayosWebhook({
      orderCode: 1000000000,
      paymentLinkId: 'link-sub-7',
      reference: 'REF-SUB-7',
      amount: 200000,
      currency: 'VND',
      transactionDateTime: new Date('2026-07-26T00:01:00.000Z'),
    })

    expect(repository.complete).toHaveBeenCalledWith(expect.objectContaining({ transactionCode: 'REF-SUB-7' }))
    expect(result).toEqual(expect.objectContaining({ matched: true, status: 'PROCESSED' }))
  })
})
