import roleName from '@src/common/constants/role.constant'
import { ROLES_KEY } from '@src/common/decorators/decorators/roles.decorator'

jest.mock('./dashboard.service', () => ({ DashboardService: class DashboardService {} }))
const { DashboardController } = require('./dashboard.controller') as typeof import('./dashboard.controller')

describe('DashboardController', () => {
  it('keeps dashboard routes tenant-scoped and delegates action center with the active user', async () => {
    const dashboardService = { getActionCenter: jest.fn() }
    const controller = new DashboardController(dashboardService as never)
    const user = { userId: 50, roleId: 'ACCOUNTANT', roleName: 'ACCOUNTANT' }

    expect(Reflect.getMetadata(ROLES_KEY, DashboardController)).toEqual([
      roleName.LANDLORD,
      roleName.MANAGER,
      roleName.ACCOUNTANT,
    ])

    await controller.getActionCenter(user)

    expect(dashboardService.getActionCenter).toHaveBeenCalledWith(50)
  })
})
