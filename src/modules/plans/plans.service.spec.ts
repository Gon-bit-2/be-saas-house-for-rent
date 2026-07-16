import { ConflictException, NotFoundException } from '@nestjs/common'

jest.mock('./repositories/plans.repo', () => ({ PlansRepository: class PlansRepository {} }))
const { PlansService } = require('./plans.service') as typeof import('./plans.service')

describe('PlansService', () => {
  let service: import('./plans.service').PlansService
  let plansRepository: Record<string, jest.Mock>

  beforeEach(() => {
    plansRepository = {
      findManyAndCount: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    }
    service = new PlansService(plansRepository as never)
  })

  it('creates a plan with a normalized code and creator audit field', async () => {
    plansRepository.findByCode.mockResolvedValue(null)
    plansRepository.create.mockResolvedValue({ id: 1, code: 'BASIC_PLAN' })

    const result = await service.create(
      {
        code: ' basic plan ',
        name: 'Basic',
        description: 'Starter landlord package',
        priceMonthly: 99000,
        priceYearly: 990000,
        maxRooms: 20,
        maxStaff: 2,
        allowAiOcr: false,
        allowWebhookPayment: true,
        isActive: true,
      },
      99,
    )

    expect(result).toEqual({ id: 1, code: 'BASIC_PLAN' })
    expect(plansRepository.findByCode).toHaveBeenCalledWith('BASIC_PLAN')
    expect(plansRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'BASIC_PLAN', createdBy: { connect: { id: 99 } } }),
    )
  })

  it('rejects duplicate plan code', async () => {
    plansRepository.findByCode.mockResolvedValue({ id: 1 })

    await expect(
      service.create(
        {
          code: 'basic',
          name: 'Basic',
          priceMonthly: 99000,
          priceYearly: 990000,
          maxRooms: 20,
          maxStaff: 2,
          allowAiOcr: false,
          allowWebhookPayment: true,
          isActive: true,
        },
        99,
      ),
    ).rejects.toBeInstanceOf(ConflictException)
    expect(plansRepository.create).not.toHaveBeenCalled()
  })

  it('updates plan active state after verifying the plan exists', async () => {
    plansRepository.findById.mockResolvedValue({ id: 1 })
    plansRepository.update.mockResolvedValue({ id: 1, isActive: false })

    const result = await service.update(1, { isActive: false }, 99)

    expect(result).toEqual({ id: 1, isActive: false })
    expect(plansRepository.update).toHaveBeenCalledWith(1, {
      isActive: false,
      description: undefined,
      updatedBy: { connect: { id: 99 } },
    })
  })

  it('throws when updating a missing plan', async () => {
    plansRepository.findById.mockResolvedValue(null)

    await expect(service.update(404, { isActive: false }, 99)).rejects.toBeInstanceOf(NotFoundException)
    expect(plansRepository.update).not.toHaveBeenCalled()
  })
})
