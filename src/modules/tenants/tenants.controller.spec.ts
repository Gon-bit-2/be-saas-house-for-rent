import { AUTH_TYPE_KEY } from '@src/common/decorators/decorators/auth.decorator'
import roleName from '@src/common/constants/role.constant'
import { ROLES_KEY } from '@src/common/decorators/decorators/roles.decorator'

jest.mock('./tenants.service', () => ({ TenantsService: class TenantsService {} }))
const { TenantsController } = require('./tenants.controller') as typeof import('./tenants.controller')

describe('TenantsController', () => {
  let controller: import('./tenants.controller').TenantsController
  let tenantsService: Record<string, jest.Mock>
  const user = { userId: 99, roleId: 'ADMIN', roleName: 'ADMIN' }

  beforeEach(() => {
    tenantsService = {
      list: jest.fn().mockResolvedValue({ data: [] }),
      getById: jest.fn().mockResolvedValue({ id: 1 }),
      createLandlordTenant: jest.fn().mockResolvedValue({ id: 1 }),
      update: jest.fn().mockResolvedValue({ id: 1 }),
      updateStatus: jest.fn().mockResolvedValue({ id: 1 }),
      updateVerification: jest.fn().mockResolvedValue({ id: 1 }),
      assignPlan: jest.fn().mockResolvedValue({ id: 1 }),
    }
    controller = new TenantsController(tenantsService as never)
  })

  it('is restricted to Super Admin and is not public', () => {
    expect(Reflect.getMetadata(ROLES_KEY, TenantsController)).toEqual([roleName.ADMIN])
    expect(Reflect.getMetadata(AUTH_TYPE_KEY, TenantsController)).toBeUndefined()
  })

  it('delegates reads to TenantsService', async () => {
    await controller.list({ page: 1, limit: 10, search: 'cau giay' })
    await controller.getById(1)

    expect(tenantsService.list).toHaveBeenCalledWith({ page: 1, limit: 10, search: 'cau giay' })
    expect(tenantsService.getById).toHaveBeenCalledWith(1)
  })

  it('delegates create and tenant updates with active user id', async () => {
    const createBody = {
      fullName: 'Nguyen Van A',
      email: 'owner@example.com',
      password: 'Password1!',
      tenantName: 'Tenant A',
      planId: 1,
      billingCycle: 'MONTHLY' as const,
      autoRenew: true,
    }

    await controller.createLandlordTenant(user, createBody)
    await controller.update(user, 1, { name: 'Tenant B' })
    await controller.updateStatus(user, 1, { status: 'SUSPENDED' })
    await controller.updateVerification(user, 1, { verificationStatus: 'VERIFIED' })
    await controller.assignPlan(user, 1, { planId: 2, billingCycle: 'YEARLY', autoRenew: false })

    expect(tenantsService.createLandlordTenant).toHaveBeenCalledWith(createBody, 99)
    expect(tenantsService.update).toHaveBeenCalledWith(1, { name: 'Tenant B' }, 99)
    expect(tenantsService.updateStatus).toHaveBeenCalledWith(1, { status: 'SUSPENDED' }, 99)
    expect(tenantsService.updateVerification).toHaveBeenCalledWith(1, { verificationStatus: 'VERIFIED' }, 99)
    expect(tenantsService.assignPlan).toHaveBeenCalledWith(1, { planId: 2, billingCycle: 'YEARLY', autoRenew: false }, 99)
  })
})
