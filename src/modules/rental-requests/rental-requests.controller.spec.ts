import { ROLES_KEY } from '@src/common/decorators/decorators/roles.decorator'
import roleName from '@src/common/constants/role.constant'

jest.mock('./rental-requests.service', () => ({ RentalRequestsService: class RentalRequestsService {} }))
const { RentalRequestsController } = require('./rental-requests.controller') as typeof import('./rental-requests.controller')

describe('RentalRequestsController', () => {
  let controller: import('./rental-requests.controller').RentalRequestsController
  let rentalRequestsService: Record<string, jest.Mock>
  const user = { userId: 99, roleId: 'TENANT', roleName: 'TENANT' }

  beforeEach(() => {
    rentalRequestsService = {
      listMine: jest.fn(),
      cancelMine: jest.fn(),
      listForLandlord: jest.fn(),
      getForLandlord: jest.fn(),
      decide: jest.fn(),
    }
    controller = new RentalRequestsController(rentalRequestsService as never)
  })

  it('uses tenant role for self routes and landlord/manager roles for decision routes', () => {
    expect(Reflect.getMetadata(ROLES_KEY, RentalRequestsController.prototype.listMine)).toEqual([roleName.TENANT])
    expect(Reflect.getMetadata(ROLES_KEY, RentalRequestsController.prototype.cancelMine)).toEqual([roleName.TENANT])
    expect(Reflect.getMetadata(ROLES_KEY, RentalRequestsController.prototype.decide)).toEqual([
      roleName.LANDLORD,
      roleName.MANAGER,
    ])
  })

  it('delegates renter and landlord request operations', async () => {
    await controller.listMine(user, { page: 1, limit: 20 })
    await controller.cancelMine(user, 7, {})
    await controller.listForLandlord(user, { page: 1, limit: 20, status: 'PENDING' })
    await controller.getForLandlord(user, 7)
    await controller.decide(user, 7, { status: 'APPROVED' })

    expect(rentalRequestsService.listMine).toHaveBeenCalledWith(99, { page: 1, limit: 20 })
    expect(rentalRequestsService.cancelMine).toHaveBeenCalledWith(99, 7, {})
    expect(rentalRequestsService.listForLandlord).toHaveBeenCalledWith(99, { page: 1, limit: 20, status: 'PENDING' })
    expect(rentalRequestsService.getForLandlord).toHaveBeenCalledWith(99, 7)
    expect(rentalRequestsService.decide).toHaveBeenCalledWith(99, 7, { status: 'APPROVED' })
  })
})
