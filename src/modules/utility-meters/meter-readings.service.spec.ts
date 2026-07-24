import { BadRequestException, ConflictException } from '@nestjs/common'

jest.mock('@src/shared/modules/services/tenant-access.service', () => ({ TenantAccessService: class TenantAccessService {} }))
jest.mock('./repositories/utility-meters.repo', () => ({ UtilityMetersRepository: class UtilityMetersRepository {} }))
const { MeterReadingsService } = require('./meter-readings.service') as typeof import('./meter-readings.service')

describe('MeterReadingsService', () => {
  let service: import('./meter-readings.service').MeterReadingsService
  let utilityMetersRepository: Record<string, jest.Mock>
  let tenantAccessService: Record<string, jest.Mock>

  const activeElectricMeter = {
    id: 1,
    tenantId: 10,
    roomId: 5,
    type: 'ELECTRICITY' as const,
    status: 'ACTIVE',
    room: { electricityPrice: 3500, waterPrice: 20000 },
  }

  beforeEach(() => {
    utilityMetersRepository = {
      findReadingsAndCount: jest.fn(),
      findTenantReading: jest.fn(),
      findMeterForReading: jest.fn(),
      findReadingByMeterMonth: jest.fn(),
      findLatestReadingBeforeMonth: jest.fn(),
      findActiveContractForRoomMonth: jest.fn(),
      createManualReading: jest.fn(),
      updateReading: jest.fn(),
      updateReadingStatus: jest.fn(),
    }
    tenantAccessService = {
      getActiveTenantContext: jest.fn().mockResolvedValue({ tenantId: 10, userId: 50, memberId: 1, roleId: 'LANDLORD' }),
    }
    service = new MeterReadingsService(utilityMetersRepository as never, tenantAccessService as never)
  })

  it('creates manual reading using latest previous value and room default unit price', async () => {
    utilityMetersRepository.findMeterForReading.mockResolvedValue(activeElectricMeter)
    utilityMetersRepository.findReadingByMeterMonth.mockResolvedValue(null)
    utilityMetersRepository.findLatestReadingBeforeMonth.mockResolvedValue({ currentValue: 100 })
    utilityMetersRepository.findActiveContractForRoomMonth.mockResolvedValue({ id: 9 })
    utilityMetersRepository.createManualReading.mockResolvedValue({ id: 11 })

    await service.create(50, {
      meterId: 1,
      billingMonth: new Date('2026-07-12T00:00:00.000Z'),
      currentValue: 130,
      status: 'CONFIRMED',
    })

    expect(utilityMetersRepository.createManualReading).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 10,
        roomId: 5,
        meterId: 1,
        contractId: 9,
        billingMonth: new Date('2026-07-01T00:00:00.000Z'),
        previousValue: 100,
        currentValue: 130,
        consumption: 30,
        unitPrice: 3500,
        amount: 105000,
        source: 'MANUAL',
        status: 'CONFIRMED',
      }),
    )
  })

  it('rejects inactive or broken meters', async () => {
    utilityMetersRepository.findMeterForReading.mockResolvedValue({ ...activeElectricMeter, status: 'BROKEN' })

    await expect(
      service.create(50, { meterId: 1, billingMonth: new Date('2026-07-01T00:00:00.000Z'), currentValue: 130, status: 'DRAFT' }),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(utilityMetersRepository.createManualReading).not.toHaveBeenCalled()
  })

  it('rejects duplicate reading for the same meter month', async () => {
    utilityMetersRepository.findMeterForReading.mockResolvedValue(activeElectricMeter)
    utilityMetersRepository.findReadingByMeterMonth.mockResolvedValue({ id: 3 })

    await expect(
      service.create(50, { meterId: 1, billingMonth: new Date('2026-07-01T00:00:00.000Z'), currentValue: 130, status: 'DRAFT' }),
    ).rejects.toBeInstanceOf(ConflictException)
    expect(utilityMetersRepository.createManualReading).not.toHaveBeenCalled()
  })

  it('rejects current value lower than previous value', async () => {
    utilityMetersRepository.findMeterForReading.mockResolvedValue(activeElectricMeter)
    utilityMetersRepository.findReadingByMeterMonth.mockResolvedValue(null)
    utilityMetersRepository.findLatestReadingBeforeMonth.mockResolvedValue({ currentValue: 150 })

    await expect(
      service.create(50, { meterId: 1, billingMonth: new Date('2026-07-01T00:00:00.000Z'), currentValue: 130, status: 'DRAFT' }),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(utilityMetersRepository.createManualReading).not.toHaveBeenCalled()
  })

  it('blocks editing confirmed readings or readings already used by invoices', async () => {
    utilityMetersRepository.findTenantReading.mockResolvedValue({ status: 'CONFIRMED', _count: { invoiceItems: 0 } })
    await expect(service.update(50, 1, { currentValue: 140 })).rejects.toBeInstanceOf(BadRequestException)

    utilityMetersRepository.findTenantReading.mockResolvedValue({ status: 'DRAFT', _count: { invoiceItems: 1 } })
    await expect(service.update(50, 1, { currentValue: 140 })).rejects.toBeInstanceOf(BadRequestException)
  })

  it('allows manual status updates such as abnormal when not used by invoices', async () => {
    utilityMetersRepository.findTenantReading.mockResolvedValue({ id: 1, status: 'DRAFT', _count: { invoiceItems: 0 } })
    utilityMetersRepository.updateReadingStatus.mockResolvedValue({ id: 1, status: 'ABNORMAL' })

    await service.updateStatus(50, 1, { status: 'ABNORMAL' })

    expect(utilityMetersRepository.updateReadingStatus).toHaveBeenCalledWith(1, 'ABNORMAL', 50)
  })
})
