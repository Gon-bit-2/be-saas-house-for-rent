import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

jest.mock('./repositories/marketplace.repo', () => ({ MarketplaceRepository: class MarketplaceRepository {} }))
jest.mock('@src/modules/notifications/notification-events.service', () => ({
  NotificationEventsService: class NotificationEventsService {},
}))
const { MarketplaceService } = require('./marketplace.service') as typeof import('./marketplace.service')

describe('MarketplaceService', () => {
  let service: import('./marketplace.service').MarketplaceService
  let marketplaceRepository: Record<string, jest.Mock>
  let notifications: Record<string, jest.Mock>

  beforeEach(() => {
    marketplaceRepository = {
      findMany: jest.fn(),
      findById: jest.fn(),
      findRenterProfile: jest.fn(),
      findActiveRentalRequest: jest.fn(),
      findAppointmentForRenterRoom: jest.fn(),
      createRentalRequest: jest.fn(),
      createViewingAppointmentWithConflictCheck: jest.fn(),
    }
    notifications = { notifyRentalRequestCreated: jest.fn(), notifyViewingAppointmentCreated: jest.fn() }
    service = new MarketplaceService(marketplaceRepository as never, notifications as never)
    jest.useFakeTimers().setSystemTime(new Date('2026-07-09T08:00:00.000Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('lists only public available marketplace rooms through repository filters', async () => {
    marketplaceRepository.findMany.mockResolvedValue([
      [
        {
          id: 1,
          tenantId: 10,
          property: { id: 2, province: 'Ha Noi', addressDetail: 'Private', latitude: 10, longitude: 106 },
        },
      ],
      1,
    ])

    const result = await service.listRooms({ page: 1, limit: 20, province: 'Ha Noi', amenityIds: [1, 2] })

    expect(result.data).toEqual([{ id: 1, property: { id: 2, province: 'Ha Noi' } }])
    expect(marketplaceRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        deletedAt: null,
        status: 'AVAILABLE',
        marketplaceStatus: 'PUBLISHED',
        tenant: { deletedAt: null, status: 'ACTIVE' },
        property: expect.objectContaining({ deletedAt: null, status: 'ACTIVE' }),
        AND: [{ amenities: { some: { amenityId: 1 } } }, { amenities: { some: { amenityId: 2 } } }],
      }),
      0,
      20,
    )
  })

  it('returns exact location on public room detail while removing tenant identity', async () => {
    marketplaceRepository.findById.mockResolvedValue({
      id: 5,
      tenantId: 10,
      property: {
        id: 2,
        province: 'Ho Chi Minh City',
        district: 'Thu Duc',
        ward: 'Linh Trung',
        addressDetail: '123 Internal Street',
        latitude: 10.123,
        longitude: 106.456,
      },
    })

    const result = await service.getRoomById(5)

    expect(result).toEqual({
      id: 5,
      property: {
        id: 2,
        province: 'Ho Chi Minh City',
        district: 'Thu Duc',
        ward: 'Linh Trung',
        addressDetail: '123 Internal Street',
        latitude: 10.123,
        longitude: 106.456,
      },
    })
  })

  it('creates rental request for a valid renter and public room', async () => {
    marketplaceRepository.findById.mockResolvedValue({ id: 5, tenantId: 10 })
    marketplaceRepository.findRenterProfile.mockResolvedValue({ id: 1 })
    marketplaceRepository.findActiveRentalRequest.mockResolvedValue(null)
    marketplaceRepository.createRentalRequest.mockResolvedValue({ id: 9 })

    await service.createRentalRequest(99, 5, {
      expectedStartDate: new Date('2026-07-10T00:00:00.000Z'),
      message: 'Toi muon thue phong',
    })

    expect(marketplaceRepository.createRentalRequest).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 10, roomId: 5, renterId: 99, status: 'PENDING', createdById: 99 }),
    )
  })

  it('rejects duplicate active rental request for same renter and room', async () => {
    marketplaceRepository.findById.mockResolvedValue({ id: 5, tenantId: 10 })
    marketplaceRepository.findRenterProfile.mockResolvedValue({ id: 1 })
    marketplaceRepository.findActiveRentalRequest.mockResolvedValue({ id: 3 })

    await expect(
      service.createRentalRequest(99, 5, { expectedStartDate: new Date('2026-07-10T00:00:00.000Z') }),
    ).rejects.toBeInstanceOf(ConflictException)
    expect(marketplaceRepository.createRentalRequest).not.toHaveBeenCalled()
  })

  it('rejects viewing appointment in the past', async () => {
    marketplaceRepository.findById.mockResolvedValue({ id: 5, tenantId: 10 })
    marketplaceRepository.findRenterProfile.mockResolvedValue({ id: 1 })

    await expect(
      service.createViewingAppointment(99, 5, { scheduledAt: new Date('2026-07-09T07:59:59.000Z') }),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(marketplaceRepository.createViewingAppointmentWithConflictCheck).not.toHaveBeenCalled()
  })

  it('throws not found for unpublished or unavailable room detail', async () => {
    marketplaceRepository.findById.mockResolvedValue(null)

    await expect(service.getRoomById(5)).rejects.toBeInstanceOf(NotFoundException)
  })
})
