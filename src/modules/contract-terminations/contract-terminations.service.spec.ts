import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { ContractTerminationsService } from './contract-terminations.service'

jest.mock('@src/shared/modules/services/tenant-access.service', () => ({
  TenantAccessService: class TenantAccessService {},
}))
jest.mock('@src/modules/notifications/notification-events.service', () => ({
  NotificationEventsService: class NotificationEventsService {},
}))
jest.mock('./repositories/contract-terminations.repo', () => ({
  ContractTerminationsRepository: class ContractTerminationsRepository {},
}))
describe('ContractTerminationsService', () => {
  let service: ContractTerminationsService
  let repository: Record<string, jest.Mock>
  let notifications: Record<string, jest.Mock>

  const contract = {
    id: 5,
    tenantId: 10,
    renterId: 99,
    roomId: 7,
    status: 'ACTIVE',
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    endDate: new Date('2027-01-01T00:00:00.000Z'),
  }
  const request = {
    id: 8,
    tenantId: 10,
    contractId: 5,
    status: 'APPROVED',
    createdById: 99,
    contract: { contractCode: 'HD-1', renterId: 99, startDate: contract.startDate },
  }

  beforeEach(() => {
    repository = {
      findMany: jest.fn(),
      findMine: jest.fn(),
      findById: jest.fn(),
      getMine: jest.fn(),
      getContract: jest.fn(),
      getMyContract: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      complete: jest.fn(),
    }
    const tenantAccess = { getActiveTenantContext: jest.fn().mockResolvedValue({ tenantId: 10 }) }
    notifications = { notifyTerminationChanged: jest.fn().mockResolvedValue(undefined) }
    service = new ContractTerminationsService(repository as never, tenantAccess as never, notifications as never)
    jest.useFakeTimers().setSystemTime(new Date('2026-07-29T00:00:00.000Z'))
  })

  afterEach(() => jest.useRealTimers())

  it('lets the main renter create a pending request', async () => {
    repository.getMyContract.mockResolvedValue(contract)
    repository.create.mockResolvedValue({ ...request, status: 'PENDING' })
    await service.createMine(99, {
      contractId: 5,
      reason: 'Chuyen nha',
      expectedMoveOutDate: new Date('2026-08-01T00:00:00.000Z'),
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 10, contractId: 5, status: 'PENDING', createdById: 99 }),
      99,
    )
  })

  it('rejects a termination request for an unrelated renter', async () => {
    repository.getMyContract.mockResolvedValue(null)
    await expect(
      service.createMine(100, {
        contractId: 5,
        reason: 'x',
        expectedMoveOutDate: new Date('2026-08-01T00:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(NotFoundException)
  })

  it('returns a conflict with outstanding debt before completion', async () => {
    repository.findById.mockResolvedValue(request)
    repository.complete.mockResolvedValue({ kind: 'debt', amount: '1500000.00' })
    await expect(
      service.complete(50, 8, {
        checkoutHandoverId: 9,
        actualMoveOutDate: new Date('2026-07-29T00:00:00.000Z'),
        acknowledgeOutstandingDebt: false,
      }),
    ).rejects.toBeInstanceOf(ConflictException)
  })

  it('requires a completion note when debt is acknowledged', async () => {
    repository.findById.mockResolvedValue(request)
    await expect(
      service.complete(50, 8, {
        checkoutHandoverId: 9,
        actualMoveOutDate: new Date('2026-07-29T00:00:00.000Z'),
        acknowledgeOutstandingDebt: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(repository.complete).not.toHaveBeenCalled()
  })

  it('completes with the returned room status', async () => {
    repository.findById.mockResolvedValue(request)
    repository.complete.mockResolvedValue({
      kind: 'completed',
      data: { ...request, status: 'COMPLETED' },
      roomStatus: 'AVAILABLE',
    })
    const result = await service.complete(50, 8, {
      checkoutHandoverId: 9,
      actualMoveOutDate: new Date('2026-07-29T00:00:00.000Z'),
      acknowledgeOutstandingDebt: true,
      completionNote: 'Tiep tuc thu no',
    })
    expect(notifications.notifyTerminationChanged).toHaveBeenCalled()
  })
})
