import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { ReviewsService } from './reviews.service'

jest.mock('@src/modules/notifications/notification-events.service', () => ({
  NotificationEventsService: class NotificationEventsService {},
}))
jest.mock('./repositories/reviews.repo', () => ({ ReviewsRepository: class ReviewsRepository {} }))

describe('ReviewsService', () => {
  let service: ReviewsService
  let repository: Record<string, jest.Mock>
  let notifications: Record<string, jest.Mock>

  const review = {
    id: 1,
    tenantId: 10,
    roomId: 20,
    contractId: 30,
    reviewerId: 40,
    rating: 5,
    content: 'Phòng sạch và dịch vụ tốt',
    cleanlinessScore: 5,
    locationScore: 4,
    priceScore: 4,
    serviceScore: 5,
    isVisible: false,
    status: 'PENDING',
    moderatedById: null,
    moderationReason: null,
    moderatedAt: null,
    createdAt: new Date('2026-07-30T00:00:00Z'),
    updatedAt: new Date('2026-07-30T00:00:00Z'),
    room: { id: 20, roomCode: 'P20', title: 'Phòng 20', marketplaceStatus: 'PUBLISHED' },
    contract: {
      id: 30,
      contractCode: 'HD30',
      status: 'ACTIVE',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2027-01-01'),
    },
    reviewer: { id: 40, fullName: 'Nguyen Van A', email: 'a@example.com', phone: '0900000000' },
    moderator: null,
  }

  const body = {
    contractId: 30,
    rating: 5,
    content: 'Phòng sạch và dịch vụ tốt',
    cleanlinessScore: 5,
    locationScore: 4,
    priceScore: 4,
    serviceScore: 5,
  }

  beforeEach(() => {
    repository = {
      findMany: jest.fn(),
      findById: jest.fn(),
      findRoom: jest.fn(),
      findContract: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      getSummary: jest.fn(),
    }
    notifications = { notifyReviewUpdated: jest.fn().mockResolvedValue(undefined) }
    service = new ReviewsService(repository as never, notifications as never)
  })

  it('creates a pending hidden review from an eligible contract', async () => {
    repository.findContract.mockResolvedValue({
      id: 30,
      tenantId: 10,
      roomId: 20,
      status: 'ACTIVE',
      startDate: new Date('2026-01-01'),
    })
    repository.create.mockResolvedValue(review)

    await service.create(40, 'TENANT', body)

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 10,
        roomId: 20,
        reviewerId: 40,
        status: 'PENDING',
        isVisible: false,
      }),
      40,
    )
  })

  it('requires the exact renter role for submission', async () => {
    await expect(service.create(1, 'ADMIN', body)).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('rejects an ineligible contract', async () => {
    repository.findContract.mockResolvedValue({
      id: 30,
      tenantId: 10,
      roomId: 20,
      status: 'DRAFT',
      startDate: new Date('2026-01-01'),
    })
    await expect(service.create(40, 'TENANT', body)).rejects.toBeInstanceOf(ConflictException)
  })

  it('maps a concurrent duplicate to conflict', async () => {
    repository.findContract.mockResolvedValue({
      id: 30,
      tenantId: 10,
      roomId: 20,
      status: 'ACTIVE',
      startDate: new Date('2026-01-01'),
    })
    repository.create.mockRejectedValue({ code: 'P2002' })
    await expect(service.create(40, 'TENANT', body)).rejects.toBeInstanceOf(ConflictException)
  })

  it('does not expose private reviewer or contract fields publicly', async () => {
    repository.findRoom.mockResolvedValue({ id: 20 })
    repository.findMany.mockResolvedValue([[{ ...review, status: 'APPROVED', isVisible: true }], 1])

    const result = await service.listPublic(20, { page: 1, limit: 20 })
    const item = result.data[0] as Record<string, unknown>

    expect(item.reviewer).toBe('Người thuê đã xác thực')
    expect(item.verifiedStay).toBe(true)
    expect(item).not.toHaveProperty('reviewerId')
    expect(item).not.toHaveProperty('contractId')
  })

  it('returns a zero-safe summary when no reviews exist', async () => {
    repository.findRoom.mockResolvedValue({ id: 20 })
    repository.getSummary.mockResolvedValue([
      {
        _count: { _all: 0 },
        _avg: { rating: null, cleanlinessScore: null, locationScore: null, priceScore: null, serviceScore: null },
      },
      [],
    ])

    const result = await service.getSummary(20)
    expect(result).toEqual(expect.objectContaining({ totalReviews: 0, averageRating: null }))
    expect(result.distribution).toEqual({ '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 })
  })

  it('approves a pending review and notifies the reviewer', async () => {
    repository.findById.mockResolvedValue(review)
    repository.update.mockResolvedValue({ ...review, status: 'APPROVED', isVisible: true })

    const result = await service.updateStatus(99, 1, { status: 'APPROVED' })

    expect(result.status).toBe('APPROVED')
    expect(repository.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ expectedStatus: 'PENDING', isVisible: true }),
    )
    expect(notifications.notifyReviewUpdated).toHaveBeenCalled()
  })

  it('rejects invalid moderation transitions', async () => {
    repository.findById.mockResolvedValue({ ...review, status: 'REJECTED' })
    await expect(service.updateStatus(99, 1, { status: 'APPROVED' })).rejects.toBeInstanceOf(ConflictException)
  })

  it('does not expose moderator identity in renter self-service', async () => {
    repository.findById.mockResolvedValue({
      ...review,
      moderatedById: 99,
      moderator: { id: 99, fullName: 'Admin', email: 'admin@example.com' },
    })

    const result = await service.getMine(40, 1)
    expect(result).not.toHaveProperty('moderatedById')
    expect(result).not.toHaveProperty('moderator')
  })
  it('does not disclose another renters private review', async () => {
    repository.findById.mockResolvedValue(review)
    await expect(service.getMine(41, 1)).rejects.toBeInstanceOf(NotFoundException)
  })
})
