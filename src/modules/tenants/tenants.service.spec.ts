import { ConflictException, NotFoundException } from '@nestjs/common'

jest.mock('./repositories/tenants.repo', () => ({ TenantsRepository: class TenantsRepository {} }))
jest.mock('../subscription-payments/subscription-payments.service', () => ({
  SubscriptionPaymentsService: class SubscriptionPaymentsService {},
}))
const { TenantsService } = require('./tenants.service') as typeof import('./tenants.service')

describe('TenantsService', () => {
  let service: import('./tenants.service').TenantsService
  let tenantsRepository: Record<string, jest.Mock>
  let hashingService: Record<string, jest.Mock>
  let subscriptionPaymentsService: Record<string, jest.Mock>

  const createBody = {
    fullName: 'Nguyen Van A',
    email: 'owner@example.com',
    phone: '0900000000',
    password: 'Password1!',
    tenantName: 'Nhà Trọ Cầu Giấy',
    taxCode: 'TAX-1',
    tenantPhone: '0911111111',
    tenantEmail: 'tenant@example.com',
    address: 'Ha Noi',
    planId: 1,
    billingCycle: 'MONTHLY' as const,
    autoRenew: true,
  }

  beforeEach(() => {
    tenantsRepository = {
      findManyAndCount: jest.fn(),
      findById: jest.fn(),
      findUserByEmail: jest.fn(),
      findUserByPhone: jest.fn(),
      findActivePlan: jest.fn(),
      isSlugTaken: jest.fn(),
      createLandlordTenant: jest.fn(),
      update: jest.fn(),
      assignPlan: jest.fn(),
    }
    hashingService = {
      hash: jest.fn().mockResolvedValue('hashed-password'),
    }
    subscriptionPaymentsService = {
      hasOpen: jest.fn().mockResolvedValue(false),
    }
    service = new TenantsService(
      tenantsRepository as never,
      hashingService as never,
      subscriptionPaymentsService as never,
    )
    jest.useFakeTimers().setSystemTime(new Date('2026-07-09T00:00:00.000Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('creates landlord, tenant, member and subscription through repository transaction input', async () => {
    tenantsRepository.findUserByEmail.mockResolvedValue(null)
    tenantsRepository.findUserByPhone.mockResolvedValue(null)
    tenantsRepository.findActivePlan.mockResolvedValue({ id: 1 })
    tenantsRepository.isSlugTaken.mockResolvedValue(false)
    tenantsRepository.createLandlordTenant.mockResolvedValue({ id: 10, slug: 'nha-tro-cau-giay' })

    const result = await service.createLandlordTenant(createBody, 99)

    expect(result).toEqual({ id: 10, slug: 'nha-tro-cau-giay' })
    expect(hashingService.hash).toHaveBeenCalledWith('Password1!')
    expect(tenantsRepository.createLandlordTenant).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'owner@example.com',
        passwordHash: 'hashed-password',
        slug: 'nha-tro-cau-giay',
        planId: 1,
        billingCycle: 'MONTHLY',
        autoRenew: true,
        actorId: 99,
        startedAt: new Date('2026-07-09T00:00:00.000Z'),
        expiredAt: new Date('2026-08-09T00:00:00.000Z'),
      }),
    )
  })

  it('rejects duplicate landlord email before creating records', async () => {
    tenantsRepository.findUserByEmail.mockResolvedValue({ id: 1 })

    await expect(service.createLandlordTenant(createBody, 99)).rejects.toBeInstanceOf(ConflictException)
    expect(tenantsRepository.createLandlordTenant).not.toHaveBeenCalled()
  })

  it('rejects inactive or missing plan before creating records', async () => {
    tenantsRepository.findUserByEmail.mockResolvedValue(null)
    tenantsRepository.findUserByPhone.mockResolvedValue(null)
    tenantsRepository.findActivePlan.mockResolvedValue(null)

    await expect(service.createLandlordTenant(createBody, 99)).rejects.toBeInstanceOf(NotFoundException)
    expect(tenantsRepository.createLandlordTenant).not.toHaveBeenCalled()
  })

  it('assigns a new yearly plan without creating a subscription payment', async () => {
    tenantsRepository.findById.mockResolvedValue({ id: 10 })
    tenantsRepository.findActivePlan.mockResolvedValue({ id: 2 })
    tenantsRepository.assignPlan.mockResolvedValue({ id: 10 })

    await service.assignPlan(10, { planId: 2, billingCycle: 'YEARLY', autoRenew: false }, 99)

    expect(tenantsRepository.assignPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 10,
        planId: 2,
        billingCycle: 'YEARLY',
        autoRenew: false,
        actorId: 99,
        startedAt: new Date('2026-07-09T00:00:00.000Z'),
        expiredAt: new Date('2027-07-09T00:00:00.000Z'),
      }),
    )
    expect((tenantsRepository as Record<string, unknown>).createSubscriptionPayment).toBeUndefined()
  })

  it('blocks an admin plan override while a PayOS checkout is pending', async () => {
    tenantsRepository.findById.mockResolvedValue({ id: 10 })
    tenantsRepository.findActivePlan.mockResolvedValue({ id: 2 })
    subscriptionPaymentsService.hasOpen.mockResolvedValue(true)

    await expect(
      service.assignPlan(10, { planId: 2, billingCycle: 'YEARLY', autoRenew: false }, 99),
    ).rejects.toBeInstanceOf(ConflictException)
    expect(tenantsRepository.assignPlan).not.toHaveBeenCalled()
  })
})
