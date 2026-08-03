import roleName from '@src/common/constants/role.constant'
import { ROLES_KEY } from '@src/common/decorators/decorators/roles.decorator'

jest.mock('./utility-meters.service', () => ({ UtilityMetersService: class UtilityMetersService {} }))
const { UtilityMetersController } =
  require('./utility-meters.controller') as typeof import('./utility-meters.controller')

describe('UtilityMetersController', () => {
  let controller: import('./utility-meters.controller').UtilityMetersController
  let utilityMetersService: Record<string, jest.Mock>
  const user = { userId: 50, roleId: 'LANDLORD', roleName: 'LANDLORD' }

  beforeEach(() => {
    utilityMetersService = {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
    }
    controller = new UtilityMetersController(utilityMetersService as never)
  })

  it('restricts meter configuration to landlord and manager', () => {
    expect(Reflect.getMetadata(ROLES_KEY, UtilityMetersController)).toEqual([roleName.LANDLORD, roleName.MANAGER])
  })

  it('delegates meter operations with active user id', async () => {
    await controller.list(user, { page: 1, limit: 20, type: 'ELECTRICITY' })
    await controller.getById(user, 1)
    await controller.create(user, { roomId: 5, type: 'WATER', meterCode: 'W-001', status: 'ACTIVE' })
    await controller.update(user, 1, { meterCode: 'W-002' })
    await controller.updateStatus(user, 1, { status: 'BROKEN' })

    expect(utilityMetersService.list).toHaveBeenCalledWith(50, { page: 1, limit: 20, type: 'ELECTRICITY' })
    expect(utilityMetersService.getById).toHaveBeenCalledWith(50, 1)
    expect(utilityMetersService.create).toHaveBeenCalledWith(50, {
      roomId: 5,
      type: 'WATER',
      meterCode: 'W-001',
      status: 'ACTIVE',
    })
    expect(utilityMetersService.update).toHaveBeenCalledWith(50, 1, { meterCode: 'W-002' })
    expect(utilityMetersService.updateStatus).toHaveBeenCalledWith(50, 1, { status: 'BROKEN' })
  })
})
