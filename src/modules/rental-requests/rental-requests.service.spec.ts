import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

jest.mock('@src/shared/modules/services/tenant-access.service', () => ({
  TenantAccessService: class TenantAccessService {},
}))
jest.mock('./repositories/rental-requests.repo', () => ({
  RentalRequestsRepository: class RentalRequestsRepository {},
}))
const { RentalRequestsService } = require('./rental-requests.service') as typeof import('./rental-requests.service')

describe('RentalRequestsService', () => {
  let service: import('./rental-requests.service').RentalRequestsService
  let rentalRequestsRepository: Record<string, jest.Mock>
  let tenantAccessService: Record<string, jest.Mock>

  beforeEach(() => {
    rentalRequestsRepository = {
      findRequestsAndCount: jest.fn(),
      findTenantRequest: jest.fn(),
      approveRequestAndReserveRoom: jest.fn(),
      updateRequestStatus: jest.fn(),
      findMyRequestsAndCount: jest.fn(),
      findRenterRequest: jest.fn(),
      cancelRenterRequest: jest.fn(),
    }
    tenantAccessService = {
      getActiveTenantContext: jest
        .fn()
        .mockResolvedValue({ tenantId: 10, userId: 50, memberId: 1, roleId: 'LANDLORD' }),
    }
    service = new RentalRequestsService(rentalRequestsRepository as never, tenantAccessService as never)
  })

  it('approves a pending request through transaction that reserves the room', async () => {
    rentalRequestsRepository.findTenantRequest.mockResolvedValue({
      id: 7,
      status: 'PENDING',
      room: { status: 'AVAILABLE' },
    })
    rentalRequestsRepository.approveRequestAndReserveRoom.mockResolvedValue({ id: 7, status: 'APPROVED' })

    await service.decide(50, 7, { status: 'APPROVED' })

    expect(rentalRequestsRepository.approveRequestAndReserveRoom).toHaveBeenCalledWith(10, 7, 50)
    expect(rentalRequestsRepository.updateRequestStatus).not.toHaveBeenCalled()
  })

  it('maps concurrent room reservation to a conflict response', async () => {
    rentalRequestsRepository.findTenantRequest.mockResolvedValue({
      id: 7,
      status: 'PENDING',
      room: { status: 'AVAILABLE' },
    })
    rentalRequestsRepository.approveRequestAndReserveRoom.mockRejectedValue(new Error('ROOM_RESERVATION_CONFLICT'))

    await expect(service.decide(50, 7, { status: 'APPROVED' })).rejects.toBeInstanceOf(ConflictException)
  })

  it('rejects approval when room is not available', async () => {
    rentalRequestsRepository.findTenantRequest.mockResolvedValue({
      id: 7,
      status: 'PENDING',
      room: { status: 'RESERVED' },
    })

    await expect(service.decide(50, 7, { status: 'APPROVED' })).rejects.toBeInstanceOf(BadRequestException)
    expect(rentalRequestsRepository.approveRequestAndReserveRoom).not.toHaveBeenCalled()
  })

  it('updates request only for rejected or need-more-info decisions', async () => {
    rentalRequestsRepository.findTenantRequest.mockResolvedValue({
      id: 7,
      status: 'PENDING',
      room: { status: 'AVAILABLE' },
    })
    rentalRequestsRepository.updateRequestStatus.mockResolvedValue({ id: 7, status: 'REJECTED' })

    await service.decide(50, 7, { status: 'REJECTED' })

    expect(rentalRequestsRepository.updateRequestStatus).toHaveBeenCalledWith(10, 7, 'REJECTED', 50)
    expect(rentalRequestsRepository.approveRequestAndReserveRoom).not.toHaveBeenCalled()
  })

  it('lets renter cancel only pending or need-more-info requests', async () => {
    rentalRequestsRepository.findRenterRequest.mockResolvedValue({ id: 7, status: 'PENDING' })
    rentalRequestsRepository.cancelRenterRequest.mockResolvedValue({ id: 7, status: 'CANCELED' })

    await service.cancelMine(99, 7, {})

    expect(rentalRequestsRepository.cancelRenterRequest).toHaveBeenCalledWith(7, 99)
  })

  it('throws not found when tenant request is outside current tenant', async () => {
    rentalRequestsRepository.findTenantRequest.mockResolvedValue(null)

    await expect(service.getForLandlord(50, 7)).rejects.toBeInstanceOf(NotFoundException)
  })
})
