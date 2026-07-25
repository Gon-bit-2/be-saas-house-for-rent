import { NotFoundException } from '@nestjs/common'

jest.mock('@src/shared/modules/services/tenant-access.service', () => ({
  TenantAccessService: class TenantAccessService {},
}))
jest.mock('@src/shared/modules/services/cloudinary.service', () => ({ CloudinaryService: class CloudinaryService {} }))
jest.mock('./repositories/rooms.repo', () => ({ RoomsRepository: class RoomsRepository {} }))
const { RoomImagesService } = require('./room-images.service') as typeof import('./room-images.service')

describe('RoomImagesService', () => {
  let service: import('./room-images.service').RoomImagesService
  let roomsRepository: Record<string, jest.Mock>
  let tenantAccessService: Record<string, jest.Mock>
  let cloudinaryService: Record<string, jest.Mock>

  const file = { buffer: Buffer.from('image'), mimetype: 'image/png', originalname: 'room.png' } as Express.Multer.File

  beforeEach(() => {
    roomsRepository = {
      findById: jest.fn(),
      countImages: jest.fn(),
      createImages: jest.fn(),
      findTenantImage: jest.fn(),
      updateImage: jest.fn(),
      deleteImage: jest.fn(),
    }
    tenantAccessService = {
      getActiveTenantContext: jest
        .fn()
        .mockResolvedValue({ tenantId: 10, userId: 99, memberId: 1, roleId: 'LANDLORD' }),
    }
    cloudinaryService = {
      uploadImage: jest.fn().mockResolvedValue({ url: 'https://cdn.test/room.png', publicId: 'rooms/10/5/a' }),
      deleteImage: jest.fn().mockResolvedValue(undefined),
    }
    service = new RoomImagesService(roomsRepository as never, tenantAccessService as never, cloudinaryService as never)
  })

  it('uploads the first room image as thumbnail', async () => {
    roomsRepository.findById.mockResolvedValue({ id: 5 })
    roomsRepository.countImages.mockResolvedValue(0)
    roomsRepository.createImages.mockResolvedValue({ id: 5 })

    await service.uploadRoomImages(99, 5, [file])

    expect(cloudinaryService.uploadImage).toHaveBeenCalledWith(file, 'rooms/10/5')
    expect(roomsRepository.createImages).toHaveBeenCalledWith(5, [
      { url: 'https://cdn.test/room.png', publicId: 'rooms/10/5/a', sortOrder: 0, isThumbnail: true },
    ])
  })

  it('updates thumbnail through repository transaction', async () => {
    roomsRepository.findTenantImage.mockResolvedValue({ id: 7 })
    roomsRepository.updateImage.mockResolvedValue({ id: 7, isThumbnail: true })

    await service.updateImage(99, 5, 7, { isThumbnail: true })

    expect(roomsRepository.updateImage).toHaveBeenCalledWith(5, 7, {
      caption: undefined,
      sortOrder: undefined,
      isThumbnail: true,
    })
  })

  it('deletes db image and best-effort Cloudinary asset', async () => {
    roomsRepository.findTenantImage.mockResolvedValue({ id: 7, publicId: 'rooms/10/5/a' })
    roomsRepository.deleteImage.mockResolvedValue({ id: 7, publicId: 'rooms/10/5/a' })

    await service.deleteImage(99, 5, 7)

    expect(roomsRepository.deleteImage).toHaveBeenCalledWith(7)
    expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('rooms/10/5/a')
  })

  it('throws when image is outside the tenant room', async () => {
    roomsRepository.findTenantImage.mockResolvedValue(null)

    await expect(service.updateImage(99, 5, 7, { isThumbnail: true })).rejects.toBeInstanceOf(NotFoundException)
  })
})
