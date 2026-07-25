import { BadRequestException, ConflictException } from '@nestjs/common'

jest.mock('@src/shared/modules/services/tenant-access.service', () => ({
  TenantAccessService: class TenantAccessService {},
}))
jest.mock('./repositories/rooms.repo', () => ({ RoomsRepository: class RoomsRepository {} }))
const { RoomsService } = require('./rooms.service') as typeof import('./rooms.service')

describe('RoomsService', () => {
  let service: import('./rooms.service').RoomsService
  let roomsRepository: Record<string, jest.Mock>
  let tenantAccessService: Record<string, jest.Mock>

  const createBody = {
    propertyId: 1,
    floorId: 2,
    roomCode: 'P101',
    title: 'Phong 101',
    area: 25,
    maxOccupants: 2,
    basePrice: 2500000,
    depositAmount: 2500000,
    electricityPrice: 3500,
    waterPrice: 20000,
    status: 'AVAILABLE' as const,
    amenityIds: [1, 2],
  }

  beforeEach(() => {
    roomsRepository = {
      findMany: jest.fn(),
      findById: jest.fn(),
      findPropertyForRoom: jest.fn(),
      findFloorForProperty: jest.fn(),
      findRoomByPropertyCode: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      updateMarketplace: jest.fn(),
      countActiveAmenities: jest.fn(),
      replaceRoomAmenities: jest.fn(),
      countImages: jest.fn(),
      softDelete: jest.fn(),
    }
    tenantAccessService = {
      getActiveTenantContext: jest
        .fn()
        .mockResolvedValue({ tenantId: 10, userId: 99, memberId: 1, roleId: 'LANDLORD' }),
    }
    service = new RoomsService(roomsRepository as never, tenantAccessService as never)
  })

  it('creates a room after validating property, floor, room code, and active amenities', async () => {
    roomsRepository.findPropertyForRoom.mockResolvedValue({ id: 1, status: 'ACTIVE' })
    roomsRepository.findFloorForProperty.mockResolvedValue({ id: 2 })
    roomsRepository.findRoomByPropertyCode.mockResolvedValue(null)
    roomsRepository.countActiveAmenities.mockResolvedValue(2)
    roomsRepository.create.mockResolvedValue({ id: 5 })

    await service.create(99, createBody)

    expect(roomsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 10, propertyId: 1, roomCode: 'P101', marketplaceStatus: 'DRAFT' }),
      [1, 2],
    )
  })

  it('rejects duplicate room code in a property', async () => {
    roomsRepository.findPropertyForRoom.mockResolvedValue({ id: 1, status: 'ACTIVE' })
    roomsRepository.findFloorForProperty.mockResolvedValue({ id: 2 })
    roomsRepository.findRoomByPropertyCode.mockResolvedValue({ id: 9 })

    await expect(service.create(99, createBody)).rejects.toBeInstanceOf(ConflictException)
    expect(roomsRepository.create).not.toHaveBeenCalled()
  })

  it('rejects submitting an available room without images', async () => {
    roomsRepository.findById.mockResolvedValue({
      id: 5,
      status: 'AVAILABLE',
      marketplaceStatus: 'DRAFT',
      property: { status: 'ACTIVE' },
      images: [],
    })

    await expect(service.updateMarketplace(99, 5, { marketplaceStatus: 'PENDING_REVIEW' })).rejects.toBeInstanceOf(
      BadRequestException,
    )
    expect(roomsRepository.updateMarketplace).not.toHaveBeenCalled()
  })

  it('submits a valid draft room for admin review', async () => {
    roomsRepository.findById.mockResolvedValue({
      id: 5,
      status: 'AVAILABLE',
      marketplaceStatus: 'DRAFT',
      property: { status: 'ACTIVE' },
      images: [{ id: 1 }],
    })
    roomsRepository.updateMarketplace.mockResolvedValue({ id: 5, marketplaceStatus: 'PENDING_REVIEW' })

    await service.updateMarketplace(99, 5, { marketplaceStatus: 'PENDING_REVIEW' })

    expect(roomsRepository.updateMarketplace).toHaveBeenCalledWith(5, 99, 'DRAFT', 'PENDING_REVIEW')
  })

  it('hides marketplace when room status changes away from available', async () => {
    roomsRepository.findById.mockResolvedValue({
      id: 5,
      status: 'AVAILABLE',
      marketplaceStatus: 'PUBLISHED',
      property: { status: 'ACTIVE' },
    })
    roomsRepository.updateStatus.mockResolvedValue({ id: 5, status: 'MAINTENANCE' })

    await service.updateStatus(99, 5, { status: 'MAINTENANCE' })

    expect(roomsRepository.updateStatus).toHaveBeenCalledWith(5, 'MAINTENANCE', 99, 'PUBLISHED')
  })
})
