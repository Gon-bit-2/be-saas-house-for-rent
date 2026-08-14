import { ROLES_KEY } from '@src/common/decorators/decorators/roles.decorator'
import roleName from '@src/common/constants/role.constant'

jest.mock('./renters.service', () => ({ RentersService: class RentersService {} }))
const { RentersController } = require('./renters.controller') as typeof import('./renters.controller')

describe('RentersController', () => {
  let controller: import('./renters.controller').RentersController
  let rentersService: Record<string, jest.Mock>
  const user = { userId: 99, roleId: 'TENANT', roleName: 'TENANT' }

  beforeEach(() => {
    rentersService = {
      getMe: jest.fn(),
      updateMe: jest.fn(),
      listForLandlord: jest.fn(),
      getForLandlord: jest.fn(),
      getInvitation: jest.fn(),
    }
    controller = new RentersController(rentersService as never)
  })

  it('uses tenant role for self profile and landlord/manager roles for tenant lookup', () => {
    expect(Reflect.getMetadata(ROLES_KEY, RentersController.prototype.getMe)).toEqual([roleName.TENANT])
    expect(Reflect.getMetadata(ROLES_KEY, RentersController.prototype.updateMe)).toEqual([roleName.TENANT])
    expect(Reflect.getMetadata(ROLES_KEY, RentersController.prototype.listForLandlord)).toEqual([
      roleName.LANDLORD,
      roleName.MANAGER,
    ])
    expect(Reflect.getMetadata(ROLES_KEY, RentersController.prototype.getInvitation)).toEqual([
      roleName.LANDLORD,
      roleName.MANAGER,
    ])
  })

  it('delegates profile and landlord lookup operations', async () => {
    await controller.getMe(user)
    await controller.updateMe(user, { occupation: 'Developer' })
    await controller.listForLandlord(user, { page: 1, limit: 20 })
    await controller.getInvitation(user, 7)
    await controller.getForLandlord(user, 5)

    expect(rentersService.getMe).toHaveBeenCalledWith(99)
    expect(rentersService.updateMe).toHaveBeenCalledWith(99, { occupation: 'Developer' })
    expect(rentersService.listForLandlord).toHaveBeenCalledWith(99, { page: 1, limit: 20 })
    expect(rentersService.getInvitation).toHaveBeenCalledWith(99, 7)
    expect(rentersService.getForLandlord).toHaveBeenCalledWith(99, 5)
  })
})
