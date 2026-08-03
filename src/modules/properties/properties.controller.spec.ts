import { AUTH_TYPE_KEY } from '@src/common/decorators/decorators/auth.decorator'
import roleName from '@src/common/constants/role.constant'
import { ROLES_KEY } from '@src/common/decorators/decorators/roles.decorator'

jest.mock('./properties.service', () => ({ PropertiesService: class PropertiesService {} }))
const { PropertiesController } = require('./properties.controller') as typeof import('./properties.controller')

describe('PropertiesController', () => {
  let controller: import('./properties.controller').PropertiesController
  let propertiesService: Record<string, jest.Mock>
  const user = { userId: 99, roleId: 'LANDLORD', roleName: 'LANDLORD' }

  beforeEach(() => {
    propertiesService = {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      softDelete: jest.fn(),
      listFloors: jest.fn(),
      createFloor: jest.fn(),
      updateFloor: jest.fn(),
      deleteFloor: jest.fn(),
    }
    controller = new PropertiesController(propertiesService as never)
  })

  it('is restricted to landlord and manager and is not public', () => {
    expect(Reflect.getMetadata(ROLES_KEY, PropertiesController)).toEqual([roleName.LANDLORD, roleName.MANAGER])
    expect(Reflect.getMetadata(AUTH_TYPE_KEY, PropertiesController)).toBeUndefined()
  })

  it('delegates property and floor mutations with active user id', async () => {
    await controller.create(user, {
      name: 'Nha A',
      type: 'HOUSE',
      province: 'HN',
      district: 'CG',
      ward: 'DV',
      addressDetail: '1',
      status: 'ACTIVE',
    })
    await controller.createFloor(user, 1, { name: 'Tang 1', floorNumber: 1 })
    await controller.deleteFloor(user, 1, 2)

    expect(propertiesService.create).toHaveBeenCalledWith(99, expect.objectContaining({ name: 'Nha A' }))
    expect(propertiesService.createFloor).toHaveBeenCalledWith(99, 1, { name: 'Tang 1', floorNumber: 1 })
    expect(propertiesService.deleteFloor).toHaveBeenCalledWith(99, 1, 2)
  })
})
