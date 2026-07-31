import { BadRequestException, ConflictException } from '@nestjs/common'
import { HandoversService } from './handovers.service'

jest.mock('@src/shared/modules/services/tenant-access.service', () => ({
  TenantAccessService: class TenantAccessService {},
}))
jest.mock('@src/modules/notifications/notification-events.service', () => ({
  NotificationEventsService: class NotificationEventsService {},
}))
jest.mock('./repositories/handovers.repo', () => ({ HandoversRepository: class HandoversRepository {} }))
describe('HandoversService', () => {
  let service: HandoversService
  let repository: Record<string, jest.Mock>

  const record = {
    id: 2,
    tenantId: 10,
    contractId: 5,
    roomId: 7,
    type: 'CHECKIN',
    note: null,
    status: 'DRAFT',
    version: 1,
    signedByLandlordAt: null,
    signedByRenterAt: null,
    contract: { contractCode: 'HD-1', renterId: 99 },
    assetItems: [],
  }

  beforeEach(() => {
    repository = {
      findMany: jest.fn(),
      findMine: jest.fn(),
      findById: jest.fn(),
      getMine: jest.fn(),
      getContract: jest.fn(),
      getAssets: jest.fn(),
      getCheckin: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    }
    const tenantAccess = { getActiveTenantContext: jest.fn().mockResolvedValue({ tenantId: 10 }) }
    const notifications = { notifyHandoverChanged: jest.fn().mockResolvedValue(undefined) }
    service = new HandoversService(repository as never, tenantAccess as never, notifications as never)
  })

  it('creates a check-in from the room inventory snapshot', async () => {
    repository.getContract.mockResolvedValue({
      id: 5,
      tenantId: 10,
      roomId: 7,
      renterId: 99,
      status: 'ACTIVE',
      terminationRequests: [],
    })
    repository.getAssets.mockResolvedValue([
      {
        id: 3,
        name: 'May lanh',
        quantity: 1,
        condition: 'GOOD',
        description: null,
        imageUrl: null,
        category: { name: 'Dien may' },
      },
    ])
    repository.create.mockResolvedValue(record)
    await service.create(50, { contractId: 5, type: 'CHECKIN' })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ contractId: 5, roomId: 7, contentHash: expect.stringMatching(/^[a-f0-9]{64}$/) }),
      [expect.objectContaining({ roomAssetId: 3, assetName: 'May lanh', expectedQuantity: 1 })],
      50,
    )
  })

  it('requires an approved termination before checkout', async () => {
    repository.getContract.mockResolvedValue({
      id: 5,
      tenantId: 10,
      roomId: 7,
      renterId: 99,
      status: 'ACTIVE',
      terminationRequests: [],
    })
    await expect(service.create(50, { contractId: 5, type: 'CHECKOUT' })).rejects.toBeInstanceOf(BadRequestException)
  })

  it('does not let a co-renter confirm the legal record', async () => {
    repository.getMine.mockResolvedValue({ ...record, contract: { ...record.contract, renterId: 99 } })
    await expect(service.confirmMine(100, 2, { version: 1 })).rejects.toBeInstanceOf(BadRequestException)
  })

  it('rejects stale versions during confirmation', async () => {
    repository.findById.mockResolvedValue(record)
    repository.update.mockResolvedValue(null)
    await expect(service.confirmStaff(50, 2, { version: 1 })).rejects.toBeInstanceOf(ConflictException)
  })

  it('locks content after the first signature', async () => {
    repository.findById.mockResolvedValue({ ...record, signedByRenterAt: new Date() })
    await expect(service.update(50, 2, { version: 1, note: 'changed' })).rejects.toBeInstanceOf(BadRequestException)
  })
})
