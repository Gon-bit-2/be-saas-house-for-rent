import { ConflictException, NotFoundException } from '@nestjs/common'

jest.mock('@src/shared/modules/services/tenant-access.service', () => ({
  TenantAccessService: class TenantAccessService {},
}))
jest.mock('./repositories/utility-meters.repo', () => ({ UtilityMetersRepository: class UtilityMetersRepository {} }))
const { UtilityMetersService } = require('./utility-meters.service') as typeof import('./utility-meters.service')

describe('UtilityMetersService', () => {
  let service: import('./utility-meters.service').UtilityMetersService
  let utilityMetersRepository: Record<string, jest.Mock>
  let tenantAccessService: Record<string, jest.Mock>

  beforeEach(() => {
    utilityMetersRepository = {
      findMetersAndCount: jest.fn(),
      findTenantMeter: jest.fn(),
      findRoomForMeter: jest.fn(),
      findMeterByRoomType: jest.fn(),
      createMeter: jest.fn(),
      updateMeter: jest.fn(),
    }
    tenantAccessService = {
      getActiveTenantContext: jest
        .fn()
        .mockResolvedValue({ tenantId: 10, userId: 50, memberId: 1, roleId: 'LANDLORD' }),
    }
    service = new UtilityMetersService(utilityMetersRepository as never, tenantAccessService as never)
  })

  it('creates a meter with default unit by type', async () => {
    utilityMetersRepository.findRoomForMeter.mockResolvedValue({ id: 5 })
    utilityMetersRepository.findMeterByRoomType.mockResolvedValue(null)
    utilityMetersRepository.createMeter.mockResolvedValue({ id: 1 })

    await service.create(50, { roomId: 5, type: 'WATER', meterCode: 'W-001', status: 'ACTIVE' })

    expect(utilityMetersRepository.createMeter).toHaveBeenCalledWith({
      tenantId: 10,
      roomId: 5,
      type: 'WATER',
      meterCode: 'W-001',
      unit: 'm3',
      status: 'ACTIVE',
    })
  })

  it('rejects meter creation when room is outside current tenant', async () => {
    utilityMetersRepository.findRoomForMeter.mockResolvedValue(null)

    await expect(
      service.create(50, { roomId: 5, type: 'ELECTRICITY', meterCode: 'E-001', status: 'ACTIVE' }),
    ).rejects.toBeInstanceOf(NotFoundException)
    expect(utilityMetersRepository.createMeter).not.toHaveBeenCalled()
  })

  it('rejects duplicate meter type in the same room', async () => {
    utilityMetersRepository.findRoomForMeter.mockResolvedValue({ id: 5 })
    utilityMetersRepository.findMeterByRoomType.mockResolvedValue({ id: 1 })

    await expect(
      service.create(50, { roomId: 5, type: 'ELECTRICITY', meterCode: 'E-001', status: 'ACTIVE' }),
    ).rejects.toBeInstanceOf(ConflictException)
    expect(utilityMetersRepository.createMeter).not.toHaveBeenCalled()
  })

  it('updates meter status after tenant ownership check', async () => {
    utilityMetersRepository.findTenantMeter.mockResolvedValue({ id: 1 })
    utilityMetersRepository.updateMeter.mockResolvedValue({ id: 1, status: 'BROKEN' })

    await service.updateStatus(50, 1, { status: 'BROKEN' })

    expect(utilityMetersRepository.updateMeter).toHaveBeenCalledWith(1, { status: 'BROKEN' })
  })
})
