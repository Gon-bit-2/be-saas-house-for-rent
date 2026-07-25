import roleName from '@src/common/constants/role.constant'
import { ROLES_KEY } from '@src/common/decorators/decorators/roles.decorator'

jest.mock('./marketplace-admin.service', () => ({ MarketplaceAdminService: class MarketplaceAdminService {} }))
const { MarketplaceAdminController } =
  require('./marketplace-admin.controller') as typeof import('./marketplace-admin.controller')

describe('MarketplaceAdminController', () => {
  it('is restricted to Super Admin', () => {
    expect(Reflect.getMetadata(ROLES_KEY, MarketplaceAdminController)).toEqual([roleName.ADMIN])
  })

  it('passes the admin actor to moderation service', async () => {
    const service = { updateStatus: jest.fn() }
    const controller = new MarketplaceAdminController(service as never)
    const admin = { userId: 99, roleName: 'ADMIN' }

    await controller.updateStatus(admin, 5, { marketplaceStatus: 'REJECTED', reason: 'Thiếu thông tin' })

    expect(service.updateStatus).toHaveBeenCalledWith(99, 5, {
      marketplaceStatus: 'REJECTED',
      reason: 'Thiếu thông tin',
    })
  })
})
