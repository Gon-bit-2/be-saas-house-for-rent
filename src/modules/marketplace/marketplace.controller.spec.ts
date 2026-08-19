import { AUTH_TYPE_KEY } from '@src/common/decorators/decorators/auth.decorator'
import { ROLES_KEY } from '@src/common/decorators/decorators/roles.decorator'
import roleName from '@src/common/constants/role.constant'

jest.mock('./marketplace.service', () => ({ MarketplaceService: class MarketplaceService {} }))
const { MarketplaceController } = require('./marketplace.controller') as typeof import('./marketplace.controller')

describe('MarketplaceController', () => {
  let controller: import('./marketplace.controller').MarketplaceController
  let marketplaceService: Record<string, jest.Mock>
  const user = { userId: 99, roleId: 'TENANT', roleName: 'TENANT' }

  beforeEach(() => {
    marketplaceService = {
      listRooms: jest.fn(),
      listAmenities: jest.fn(),
      getRoomById: jest.fn(),
      createRentalRequest: jest.fn(),
      createViewingAppointment: jest.fn(),
    }
    controller = new MarketplaceController(marketplaceService as never)
  })

  it('marks marketplace catalog, list and detail as public', () => {
    expect(Reflect.getMetadata(AUTH_TYPE_KEY, MarketplaceController.prototype.listAmenities)).toBeDefined()
    expect(Reflect.getMetadata(AUTH_TYPE_KEY, MarketplaceController.prototype.listRooms)).toBeDefined()
    expect(Reflect.getMetadata(AUTH_TYPE_KEY, MarketplaceController.prototype.getRoomById)).toBeDefined()
  })

  it('delegates the public amenity catalog query', async () => {
    const query = { page: 1, limit: 50, search: 'wifi' }
    await controller.listAmenities(query)
    expect(marketplaceService.listAmenities).toHaveBeenCalledWith(query)
  })

  it('restricts request and appointment submission to tenants', () => {
    expect(Reflect.getMetadata(ROLES_KEY, MarketplaceController.prototype.createRentalRequest)).toEqual([
      roleName.TENANT,
    ])
    expect(Reflect.getMetadata(ROLES_KEY, MarketplaceController.prototype.createViewingAppointment)).toEqual([
      roleName.TENANT,
    ])
  })

  it('delegates renter actions with active user id and room id', async () => {
    const requestBody = { expectedStartDate: new Date('2026-07-10T00:00:00.000Z') }
    const appointmentBody = { scheduledAt: new Date('2026-07-10T09:00:00.000Z') }

    await controller.createRentalRequest(user, 5, requestBody)
    await controller.createViewingAppointment(user, 5, appointmentBody)

    expect(marketplaceService.createRentalRequest).toHaveBeenCalledWith(99, 5, requestBody)
    expect(marketplaceService.createViewingAppointment).toHaveBeenCalledWith(99, 5, appointmentBody)
  })
})
