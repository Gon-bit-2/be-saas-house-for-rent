import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

jest.mock('@src/shared/modules/services/tenant-access.service', () => ({ TenantAccessService: class TenantAccessService {} }))
jest.mock('./repositories/contracts.repo', () => ({ ContractsRepository: class ContractsRepository {} }))
const { ContractsService } = require('./contracts.service') as typeof import('./contracts.service')

describe('ContractsService', () => {
  let service: import('./contracts.service').ContractsService
  let contractsRepository: Record<string, jest.Mock>
  let tenantAccessService: Record<string, jest.Mock>

  const createBody = {
    roomId: 5,
    renterId: 99,
    rentalRequestId: 7,
    startDate: new Date('2026-08-01T00:00:00.000Z'),
    endDate: new Date('2027-08-01T00:00:00.000Z'),
    monthlyPrice: 2500000,
    depositAmount: 2500000,
    billingCycle: 'MONTHLY' as const,
    paymentDueDay: 5,
    contentSnapshot: 'Noi dung hop dong',
    coRenterIds: [100],
  }

  beforeEach(() => {
    contractsRepository = {
      findContractsAndCount: jest.fn(),
      findTenantContract: jest.fn(),
      findMyContractsAndCount: jest.fn(),
      findMyContract: jest.fn(),
      findRoomForContract: jest.fn(),
      findRentersWithProfiles: jest.fn(),
      findApprovedRentalRequest: jest.fn(),
      findTenantTemplate: jest.fn(),
      isContractCodeTaken: jest.fn(),
      countActiveRoomContracts: jest.fn(),
      createDraftContract: jest.fn(),
      updateDraftContract: jest.fn(),
      activateContract: jest.fn(),
      cancelContract: jest.fn(),
    }
    tenantAccessService = {
      getActiveTenantContext: jest.fn().mockResolvedValue({ tenantId: 10, userId: 50, memberId: 1, roleId: 'LANDLORD' }),
    }
    service = new ContractsService(contractsRepository as never, tenantAccessService as never)
    jest.useFakeTimers().setSystemTime(new Date('2026-07-12T00:00:00.000Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('creates draft contract from an approved rental request', async () => {
    contractsRepository.findRoomForContract.mockResolvedValue({ id: 5, status: 'RESERVED', maxOccupants: 2 })
    contractsRepository.findRentersWithProfiles.mockResolvedValue([{ id: 99 }, { id: 100 }])
    contractsRepository.findApprovedRentalRequest.mockResolvedValue({ id: 7, roomId: 5, renterId: 99, status: 'APPROVED' })
    contractsRepository.isContractCodeTaken.mockResolvedValue(false)
    contractsRepository.createDraftContract.mockResolvedValue({ id: 1, status: 'DRAFT' })

    await service.createDraft(50, createBody)

    expect(contractsRepository.createDraftContract).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 10,
        roomId: 5,
        renterId: 99,
        rentalRequestId: 7,
        status: 'DRAFT',
        contractCode: expect.stringMatching(/^HD-10-20260712-/),
        createdById: 50,
        updatedById: 50,
      }),
      [100],
    )
  })

  it('rejects renter without active renter profile before creating a contract', async () => {
    contractsRepository.findRoomForContract.mockResolvedValue({ id: 5, status: 'AVAILABLE', maxOccupants: 2 })
    contractsRepository.findRentersWithProfiles.mockResolvedValue([{ id: 99 }])

    await expect(service.createDraft(50, createBody)).rejects.toBeInstanceOf(BadRequestException)
    expect(contractsRepository.createDraftContract).not.toHaveBeenCalled()
  })

  it('rejects duplicate main renter in co-renter list', async () => {
    contractsRepository.findRoomForContract.mockResolvedValue({ id: 5, status: 'AVAILABLE', maxOccupants: 2 })

    await expect(service.createDraft(50, { ...createBody, coRenterIds: [99] })).rejects.toBeInstanceOf(BadRequestException)
    expect(contractsRepository.findRentersWithProfiles).not.toHaveBeenCalled()
  })

  it('rejects contracts that exceed room max occupants', async () => {
    contractsRepository.findRoomForContract.mockResolvedValue({ id: 5, status: 'AVAILABLE', maxOccupants: 2 })

    await expect(service.createDraft(50, { ...createBody, coRenterIds: [100, 101] })).rejects.toBeInstanceOf(
      BadRequestException,
    )
    expect(contractsRepository.findRentersWithProfiles).not.toHaveBeenCalled()
  })

  it('rejects approved request that does not match room and renter', async () => {
    contractsRepository.findRoomForContract.mockResolvedValue({ id: 5, status: 'RESERVED', maxOccupants: 2 })
    contractsRepository.findRentersWithProfiles.mockResolvedValue([{ id: 99 }, { id: 100 }])
    contractsRepository.findApprovedRentalRequest.mockResolvedValue({ id: 7, roomId: 6, renterId: 99, status: 'APPROVED' })

    await expect(service.createDraft(50, createBody)).rejects.toBeInstanceOf(BadRequestException)
    expect(contractsRepository.createDraftContract).not.toHaveBeenCalled()
  })

  it('activates a contract when room has no other active contract', async () => {
    contractsRepository.findTenantContract.mockResolvedValue({
      id: 1,
      roomId: 5,
      status: 'DRAFT',
      room: { status: 'RESERVED' },
    })
    contractsRepository.countActiveRoomContracts.mockResolvedValue(0)
    contractsRepository.activateContract.mockResolvedValue({ id: 1, status: 'ACTIVE' })

    await service.activate(50, 1)

    expect(contractsRepository.activateContract).toHaveBeenCalledWith(10, 1, 50)
  })

  it('rejects activation when room already has another active contract', async () => {
    contractsRepository.findTenantContract.mockResolvedValue({
      id: 1,
      roomId: 5,
      status: 'DRAFT',
      room: { status: 'AVAILABLE' },
    })
    contractsRepository.countActiveRoomContracts.mockResolvedValue(1)

    await expect(service.activate(50, 1)).rejects.toBeInstanceOf(ConflictException)
    expect(contractsRepository.activateContract).not.toHaveBeenCalled()
  })

  it('only lets renter see contracts related to them', async () => {
    contractsRepository.findMyContract.mockResolvedValue(null)

    await expect(service.getMine(99, 1)).rejects.toBeInstanceOf(NotFoundException)
  })
})
