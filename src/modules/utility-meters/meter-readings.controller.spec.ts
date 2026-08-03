import roleName from '@src/common/constants/role.constant'
import { ROLES_KEY } from '@src/common/decorators/decorators/roles.decorator'

jest.mock('./meter-readings.service', () => ({ MeterReadingsService: class MeterReadingsService {} }))
const { MeterReadingsController } =
  require('./meter-readings.controller') as typeof import('./meter-readings.controller')

describe('MeterReadingsController', () => {
  let controller: import('./meter-readings.controller').MeterReadingsController
  let meterReadingsService: Record<string, jest.Mock>
  const user = { userId: 50, roleId: 'ACCOUNTANT', roleName: 'ACCOUNTANT' }

  beforeEach(() => {
    meterReadingsService = {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
    }
    controller = new MeterReadingsController(meterReadingsService as never)
  })

  it('restricts meter readings to landlord, manager, and accountant', () => {
    expect(Reflect.getMetadata(ROLES_KEY, MeterReadingsController)).toEqual([
      roleName.LANDLORD,
      roleName.MANAGER,
      roleName.ACCOUNTANT,
    ])
  })

  it('delegates reading operations with active user id', async () => {
    const body = {
      meterId: 1,
      billingMonth: new Date('2026-07-01T00:00:00.000Z'),
      currentValue: 130,
      status: 'DRAFT' as const,
    }

    await controller.list(user, { page: 1, limit: 20, status: 'DRAFT' })
    await controller.getById(user, 1)
    await controller.create(user, body)
    await controller.update(user, 1, { currentValue: 140 })
    await controller.updateStatus(user, 1, { status: 'CONFIRMED' })

    expect(meterReadingsService.list).toHaveBeenCalledWith(50, { page: 1, limit: 20, status: 'DRAFT' })
    expect(meterReadingsService.getById).toHaveBeenCalledWith(50, 1)
    expect(meterReadingsService.create).toHaveBeenCalledWith(50, body)
    expect(meterReadingsService.update).toHaveBeenCalledWith(50, 1, { currentValue: 140 })
    expect(meterReadingsService.updateStatus).toHaveBeenCalledWith(50, 1, { status: 'CONFIRMED' })
  })
})
