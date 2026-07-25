import { AUTH_TYPE_KEY } from '@src/common/decorators/decorators/auth.decorator'
import roleName from '@src/common/constants/role.constant'
import { ROLES_KEY } from '@src/common/decorators/decorators/roles.decorator'

jest.mock('./users.service', () => ({ UsersService: class UsersService {} }))
const { UsersController } = require('./users.controller') as typeof import('./users.controller')

describe('UsersController', () => {
  let controller: import('./users.controller').UsersController
  let usersService: Record<string, jest.Mock>

  beforeEach(() => {
    usersService = {
      listLandlords: jest.fn().mockResolvedValue({ data: [] }),
      getById: jest.fn().mockResolvedValue({ id: 1 }),
      updateStatus: jest.fn().mockResolvedValue({ id: 1 }),
    }
    controller = new UsersController(usersService as never)
  })

  it('is restricted to Super Admin and is not public', () => {
    expect(Reflect.getMetadata(ROLES_KEY, UsersController)).toEqual([roleName.ADMIN])
    expect(Reflect.getMetadata(AUTH_TYPE_KEY, UsersController)).toBeUndefined()
  })

  it('delegates list and detail requests to UsersService', async () => {
    await controller.listLandlords({ page: 1, limit: 10, status: 'ACTIVE' })
    await controller.getById(1)

    expect(usersService.listLandlords).toHaveBeenCalledWith({ page: 1, limit: 10, status: 'ACTIVE' })
    expect(usersService.getById).toHaveBeenCalledWith(1)
  })

  it('delegates status updates to UsersService', async () => {
    const admin = { userId: 99, roleId: 'ADMIN', roleName: 'ADMIN' }
    await controller.updateStatus(admin, 1, { status: 'BANNED', reason: 'Vi phạm quy định' })

    expect(usersService.updateStatus).toHaveBeenCalledWith(99, 1, { status: 'BANNED', reason: 'Vi phạm quy định' })
  })
})
