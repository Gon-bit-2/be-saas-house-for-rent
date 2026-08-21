import { AUTH_TYPE_KEY } from '@src/common/decorators/decorators/auth.decorator'
import roleName from '@src/common/constants/role.constant'
import { ROLES_KEY } from '@src/common/decorators/decorators/roles.decorator'

jest.mock('./rooms.service', () => ({ RoomsService: class RoomsService {} }))
jest.mock('./room-images.service', () => ({ RoomImagesService: class RoomImagesService {} }))
const { RoomsController } = require('./rooms.controller') as typeof import('./rooms.controller')

describe('RoomsController', () => {
  let controller: import('./rooms.controller').RoomsController
  let roomsService: Record<string, jest.Mock>
  let roomImagesService: Record<string, jest.Mock>
  const user = { userId: 99, roleId: 'LANDLORD', roleName: 'LANDLORD' }

  beforeEach(() => {
    roomsService = {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      updateMarketplace: jest.fn(),
      replaceAmenities: jest.fn(),
      softDelete: jest.fn(),
    }
    roomImagesService = {
      uploadRoomImages: jest.fn(),
      updateImage: jest.fn(),
      deleteImage: jest.fn(),
    }
    controller = new RoomsController(roomsService as never, roomImagesService as never)
  })

  it('is restricted to landlord and manager and is not public', () => {
    expect(Reflect.getMetadata(ROLES_KEY, RoomsController)).toEqual([roleName.LANDLORD, roleName.MANAGER])
    expect(Reflect.getMetadata(AUTH_TYPE_KEY, RoomsController)).toBeUndefined()
  })

  it('delegates room status, marketplace, amenity, and image operations', async () => {
    await controller.updateStatus(user, 5, { status: 'MAINTENANCE' })
    await controller.updateMarketplace(user, 5, { marketplaceStatus: 'PENDING_REVIEW' })
    await controller.replaceAmenities(user, 5, { amenityIds: [1, 2] })
    await controller.uploadImages(user, 5, [{ buffer: Buffer.from('x') }] as Express.Multer.File[])

    expect(roomsService.updateStatus).toHaveBeenCalledWith(99, 5, { status: 'MAINTENANCE' })
    expect(roomsService.updateMarketplace).toHaveBeenCalledWith(99, 5, { marketplaceStatus: 'PUBLISHED' })
    expect(roomsService.replaceAmenities).toHaveBeenCalledWith(99, 5, { amenityIds: [1, 2] })
    expect(roomImagesService.uploadRoomImages).toHaveBeenCalledWith(99, 5, [{ buffer: Buffer.from('x') }])
  })
})
