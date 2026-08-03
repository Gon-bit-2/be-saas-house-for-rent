import { BadRequestException, ConflictException } from '@nestjs/common'
import { UpdateAdminMarketplaceStatusBodySchema } from './model/marketplace-admin.model'

jest.mock('./repositories/marketplace-admin.repo', () => ({
  MarketplaceAdminRepository: class MarketplaceAdminRepository {},
}))
jest.mock('@src/modules/notifications/notification-events.service', () => ({
  NotificationEventsService: class NotificationEventsService {},
}))
const { MarketplaceAdminService } =
  require('./marketplace-admin.service') as typeof import('./marketplace-admin.service')

describe('MarketplaceAdminService', () => {
  let service: import('./marketplace-admin.service').MarketplaceAdminService
  let repository: Record<string, jest.Mock>
  let notifications: Record<string, jest.Mock>

  const pendingRoom = {
    id: 5,
    status: 'AVAILABLE',
    marketplaceStatus: 'PENDING_REVIEW',
    property: { status: 'ACTIVE', deletedAt: null },
    tenant: { status: 'ACTIVE', deletedAt: null },
    images: [{ id: 1 }],
  }

  beforeEach(() => {
    repository = {
      findMany: jest.fn(),
      findById: jest.fn(),
      findHistory: jest.fn(),
      update: jest.fn(),
    }
    notifications = { notifyMarketplaceModerated: jest.fn() }
    service = new MarketplaceAdminService(repository as never, notifications as never)
  })

  it('lists moderation rooms with pagination', async () => {
    repository.findMany.mockResolvedValue([[{ id: 5 }], 1])

    const result = await service.list({ page: 2, limit: 5, marketplaceStatus: 'PENDING_REVIEW' })

    expect(result.meta).toEqual({ page: 2, limit: 5, total: 1, totalPages: 1 })
    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ marketplaceStatus: 'PENDING_REVIEW' }),
      5,
      5,
    )
  })

  it('approves an eligible pending room', async () => {
    repository.findById.mockResolvedValue(pendingRoom)
    repository.update.mockResolvedValue({ ...pendingRoom, marketplaceStatus: 'PUBLISHED' })

    const result = await service.updateStatus(99, 5, { marketplaceStatus: 'PUBLISHED' })

    expect(result.marketplaceStatus).toBe('PUBLISHED')
    expect(repository.update).toHaveBeenCalledWith(
      5,
      expect.objectContaining({
        actorId: 99,
        fromStatus: 'PENDING_REVIEW',
        toStatus: 'PUBLISHED',
        requirePublishEligibility: true,
      }),
    )
  })

  it('rejects invalid moderation transitions', async () => {
    repository.findById.mockResolvedValue({ ...pendingRoom, marketplaceStatus: 'DRAFT' })

    await expect(service.updateStatus(99, 5, { marketplaceStatus: 'PUBLISHED' })).rejects.toBeInstanceOf(
      BadRequestException,
    )
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('reports a conflict when the room changes during moderation', async () => {
    repository.findById.mockResolvedValue(pendingRoom)
    repository.update.mockResolvedValue(null)

    await expect(service.updateStatus(99, 5, { marketplaceStatus: 'PUBLISHED' })).rejects.toBeInstanceOf(
      ConflictException,
    )
  })

  it('requires a reason for reject and admin hide requests', () => {
    expect(UpdateAdminMarketplaceStatusBodySchema.safeParse({ marketplaceStatus: 'REJECTED' }).success).toBe(false)
    expect(UpdateAdminMarketplaceStatusBodySchema.safeParse({ marketplaceStatus: 'HIDDEN' }).success).toBe(false)
    expect(
      UpdateAdminMarketplaceStatusBodySchema.safeParse({
        marketplaceStatus: 'REJECTED',
        reason: 'Thông tin không hợp lệ',
      }).success,
    ).toBe(true)
  })
})
