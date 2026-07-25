import roleName from '@src/common/constants/role.constant'
import { ROLES_KEY } from '@src/common/decorators/decorators/roles.decorator'

jest.mock('./platform-dashboard.service', () => ({ PlatformDashboardService: class PlatformDashboardService {} }))
const { PlatformDashboardController } =
  require('./platform-dashboard.controller') as typeof import('./platform-dashboard.controller')

describe('PlatformDashboardController', () => {
  it('is restricted to Super Admin', () => {
    expect(Reflect.getMetadata(ROLES_KEY, PlatformDashboardController)).toEqual([roleName.ADMIN])
  })
})
