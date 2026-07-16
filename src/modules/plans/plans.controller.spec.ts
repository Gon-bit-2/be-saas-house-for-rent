import { AUTH_TYPE_KEY } from '@src/common/decorators/decorators/auth.decorator'
import roleName from '@src/common/constants/role.constant'
import { ROLES_KEY } from '@src/common/decorators/decorators/roles.decorator'

jest.mock('./plans.service', () => ({ PlansService: class PlansService {} }))
const { PlansController } = require('./plans.controller') as typeof import('./plans.controller')

describe('PlansController', () => {
  let controller: import('./plans.controller').PlansController
  let plansService: Record<string, jest.Mock>

  beforeEach(() => {
    plansService = {
      list: jest.fn().mockResolvedValue({ data: [] }),
      getById: jest.fn().mockResolvedValue({ id: 1 }),
      create: jest.fn().mockResolvedValue({ id: 1 }),
      update: jest.fn().mockResolvedValue({ id: 1 }),
    }
    controller = new PlansController(plansService as never)
  })

  it('is restricted to Super Admin and is not public', () => {
    expect(Reflect.getMetadata(ROLES_KEY, PlansController)).toEqual([roleName.ADMIN])
    expect(Reflect.getMetadata(AUTH_TYPE_KEY, PlansController)).toBeUndefined()
  })

  it('delegates list and detail requests to PlansService', async () => {
    await controller.list({ page: 1, limit: 10, search: 'basic' })
    await controller.getById(1)

    expect(plansService.list).toHaveBeenCalledWith({ page: 1, limit: 10, search: 'basic' })
    expect(plansService.getById).toHaveBeenCalledWith(1)
  })

  it('delegates mutations with active user id', async () => {
    const user = { userId: 99, roleId: 'ADMIN', roleName: 'ADMIN' }
    const createBody = {
      code: 'BASIC',
      name: 'Basic',
      priceMonthly: 1,
      priceYearly: 10,
      maxRooms: 20,
      maxStaff: 2,
      allowAiOcr: false,
      allowWebhookPayment: false,
      isActive: true,
    }

    await controller.create(user, createBody)
    await controller.update(user, 1, { isActive: false })

    expect(plansService.create).toHaveBeenCalledWith(createBody, 99)
    expect(plansService.update).toHaveBeenCalledWith(1, { isActive: false }, 99)
  })
})
