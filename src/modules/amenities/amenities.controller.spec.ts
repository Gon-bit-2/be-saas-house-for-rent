import { AUTH_TYPE_KEY } from '@src/common/decorators/decorators/auth.decorator'
import roleName from '@src/common/constants/role.constant'
import { ROLES_KEY } from '@src/common/decorators/decorators/roles.decorator'

jest.mock('./amenities.service', () => ({ AmenitiesService: class AmenitiesService {} }))
const { AmenitiesController } = require('./amenities.controller') as typeof import('./amenities.controller')

describe('AmenitiesController', () => {
  let controller: import('./amenities.controller').AmenitiesController
  let amenitiesService: Record<string, jest.Mock>
  const user = { userId: 99, roleId: 'ADMIN', roleName: 'ADMIN' }

  beforeEach(() => {
    amenitiesService = {
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    }
    controller = new AmenitiesController(amenitiesService as never)
  })

  it('is landlord/manager readable, admin-only for mutations, and not public', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AmenitiesController)).toEqual([roleName.LANDLORD, roleName.MANAGER])
    expect(Reflect.getMetadata(ROLES_KEY, AmenitiesController.prototype.create)).toEqual([roleName.ADMIN])
    expect(Reflect.getMetadata(ROLES_KEY, AmenitiesController.prototype.update)).toEqual([roleName.ADMIN])
    expect(Reflect.getMetadata(AUTH_TYPE_KEY, AmenitiesController)).toBeUndefined()
  })

  it('delegates list and admin mutations to AmenitiesService', async () => {
    await controller.list(user, { page: 1, limit: 10 })
    await controller.create(user, { name: 'Wifi', category: 'Tien nghi', icon: 'wifi', isActive: true })
    await controller.update(user, 1, { isActive: false })

    expect(amenitiesService.list).toHaveBeenCalledWith({ page: 1, limit: 10 }, 'ADMIN')
    expect(amenitiesService.create).toHaveBeenCalledWith({ name: 'Wifi', category: 'Tien nghi', icon: 'wifi', isActive: true }, 99)
    expect(amenitiesService.update).toHaveBeenCalledWith(1, { isActive: false }, 99)
  })
})
