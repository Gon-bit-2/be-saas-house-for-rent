import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

jest.mock('@src/shared/modules/services/tenant-access.service', () => ({
  TenantAccessService: class TenantAccessService {},
}))
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
      findMany: jest.fn(),
      findById: jest.fn(),
      findMine: jest.fn(),
      getMine: jest.fn(),
      findRoomForContract: jest.fn(),
      findRentersWithProfiles: jest.fn(),
      findApprovedRentalRequest: jest.fn(),
      findTenantTemplate: jest.fn(),
      isContractCodeTaken: jest.fn(),
      countActiveRoomContracts: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      activate: jest.fn(),
      expire: jest.fn(),
      cancel: jest.fn(),
    }
    tenantAccessService = {
      getActiveTenantContext: jest
        .fn()
        .mockResolvedValue({ tenantId: 10, userId: 50, memberId: 1, roleId: 'LANDLORD' }),
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
    contractsRepository.findApprovedRentalRequest.mockResolvedValue({
      id: 7,
      roomId: 5,
      renterId: 99,
      status: 'APPROVED',
    })
    contractsRepository.isContractCodeTaken.mockResolvedValue(false)
    contractsRepository.create.mockResolvedValue({ id: 1, status: 'DRAFT' })

    await service.createDraft(50, createBody)

    expect(contractsRepository.create).toHaveBeenCalledWith(
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
      undefined,
    )
  })

  it('rejects renter without active renter profile before creating a contract', async () => {
    contractsRepository.findRoomForContract.mockResolvedValue({ id: 5, status: 'AVAILABLE', maxOccupants: 2 })
    contractsRepository.findRentersWithProfiles.mockResolvedValue([{ id: 99 }])

    await expect(service.createDraft(50, createBody)).rejects.toBeInstanceOf(BadRequestException)
    expect(contractsRepository.create).not.toHaveBeenCalled()
  })

  it('rejects duplicate main renter in co-renter list', async () => {
    contractsRepository.findRoomForContract.mockResolvedValue({ id: 5, status: 'AVAILABLE', maxOccupants: 2 })

    await expect(service.createDraft(50, { ...createBody, coRenterIds: [99] })).rejects.toBeInstanceOf(
      BadRequestException,
    )
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
    contractsRepository.findApprovedRentalRequest.mockResolvedValue({
      id: 7,
      roomId: 6,
      renterId: 99,
      status: 'APPROVED',
    })

    await expect(service.createDraft(50, createBody)).rejects.toBeInstanceOf(BadRequestException)
    expect(contractsRepository.create).not.toHaveBeenCalled()
  })

  it('activates a contract when room has no other active contract', async () => {
    contractsRepository.findById.mockResolvedValue({
      id: 1,
      roomId: 5,
      status: 'DRAFT',
      room: { status: 'RESERVED' },
    })
    contractsRepository.countActiveRoomContracts.mockResolvedValue(0)
    contractsRepository.activate.mockResolvedValue({ id: 1, status: 'ACTIVE' })

    await service.activate(50, 1)

    expect(contractsRepository.activate).toHaveBeenCalledWith(10, 1, 50)
  })

  it('rejects activation when room already has another active contract', async () => {
    contractsRepository.findById.mockResolvedValue({
      id: 1,
      roomId: 5,
      status: 'DRAFT',
      room: { status: 'AVAILABLE' },
    })
    contractsRepository.countActiveRoomContracts.mockResolvedValue(1)

    await expect(service.activate(50, 1)).rejects.toBeInstanceOf(ConflictException)
    expect(contractsRepository.activate).not.toHaveBeenCalled()
  })

  it('expires a due active contract and releases its room through the repository transaction', async () => {
    contractsRepository.findById.mockResolvedValue({
      id: 1,
      status: 'ACTIVE',
      endDate: new Date('2026-07-12T00:00:00.000Z'),
      room: { status: 'OCCUPIED' },
    })
    contractsRepository.expire.mockResolvedValue({ id: 1, status: 'EXPIRED' })

    await service.expire(50, 1)

    expect(contractsRepository.expire).toHaveBeenCalledWith(10, 1, 50)
  })

  it('rejects expiry before the contract end date', async () => {
    contractsRepository.findById.mockResolvedValue({
      id: 1,
      status: 'ACTIVE',
      endDate: new Date('2026-07-13T00:00:00.000Z'),
      room: { status: 'OCCUPIED' },
    })

    await expect(service.expire(50, 1)).rejects.toBeInstanceOf(BadRequestException)
    expect(contractsRepository.expire).not.toHaveBeenCalled()
  })

  it('only lets renter see contracts related to them', async () => {
    contractsRepository.getMine.mockResolvedValue(null)

    await expect(service.getMine(99, 1)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('returns populated members for landlord and renter contract details', async () => {
    const contract = {
      id: 1,
      members: [
        {
          id: 11,
          userId: 99,
          role: 'MAIN_RENTER',
          createdAt: new Date('2026-07-01T00:00:00.000Z'),
          user: { id: 99, fullName: 'Nguyen Van A', email: 'a@example.com', phone: '0900000000' },
        },
      ],
    }
    contractsRepository.findById.mockResolvedValue(contract)
    contractsRepository.getMine.mockResolvedValue(contract)

    await expect(service.getForLandlord(50, 1)).resolves.toEqual(contract)
    await expect(service.getMine(99, 1)).resolves.toEqual(contract)
  })
})
