import roleName from '@src/common/constants/role.constant'
import { ROLES_KEY } from '@src/common/decorators/decorators/roles.decorator'

jest.mock('./contracts.service', () => ({ ContractsService: class ContractsService {} }))
const { ContractsController } = require('./contracts.controller') as typeof import('./contracts.controller')

describe('ContractsController', () => {
  let controller: import('./contracts.controller').ContractsController
  let contractsService: Record<string, jest.Mock>
  const user = { userId: 50, roleId: 'LANDLORD', roleName: 'LANDLORD' }

  beforeEach(() => {
    contractsService = {
      listMine: jest.fn(),
      getMine: jest.fn(),
      listForLandlord: jest.fn(),
      getForLandlord: jest.fn(),
      createDraft: jest.fn(),
      updateDraft: jest.fn(),
      activate: jest.fn(),
      expire: jest.fn(),
      cancel: jest.fn(),
    }
    controller = new ContractsController(contractsService as never)
  })

  it('uses tenant role for renter routes and landlord/manager roles for owner routes', () => {
    expect(Reflect.getMetadata(ROLES_KEY, ContractsController.prototype.listMine)).toEqual([roleName.TENANT])
    expect(Reflect.getMetadata(ROLES_KEY, ContractsController.prototype.getMine)).toEqual([roleName.TENANT])
    expect(Reflect.getMetadata(ROLES_KEY, ContractsController.prototype.listForLandlord)).toEqual([
      roleName.LANDLORD,
      roleName.MANAGER,
    ])
    expect(Reflect.getMetadata(ROLES_KEY, ContractsController.prototype.createDraft)).toEqual([
      roleName.LANDLORD,
      roleName.MANAGER,
    ])
    expect(Reflect.getMetadata(ROLES_KEY, ContractsController.prototype.activate)).toEqual([
      roleName.LANDLORD,
      roleName.MANAGER,
    ])
    expect(Reflect.getMetadata(ROLES_KEY, ContractsController.prototype.expire)).toEqual([
      roleName.LANDLORD,
      roleName.MANAGER,
    ])
  })

  it('delegates landlord contract operations with active user id', async () => {
    const query = { page: 1, limit: 20, status: 'DRAFT' as const }
    const body = {
      roomId: 5,
      renterId: 99,
      startDate: new Date('2026-08-01T00:00:00.000Z'),
      endDate: new Date('2027-08-01T00:00:00.000Z'),
      monthlyPrice: 2500000,
      depositAmount: 2500000,
      billingCycle: 'MONTHLY' as const,
      paymentDueDay: 5,
      contentSnapshot: 'Noi dung hop dong',
    }

    await controller.listForLandlord(user, query)
    await controller.getForLandlord(user, 1)
    await controller.createDraft(user, { ...body, coRenterIds: [] })
    await controller.updateDraft(user, 1, { monthlyPrice: 2600000, coRenterIds: [] })
    await controller.activate(user, 1)
    await controller.expire(user, 1)
    await controller.cancel(user, 1)

    expect(contractsService.listForLandlord).toHaveBeenCalledWith(50, query)
    expect(contractsService.getForLandlord).toHaveBeenCalledWith(50, 1)
    expect(contractsService.createDraft).toHaveBeenCalledWith(50, body)
    expect(contractsService.updateDraft).toHaveBeenCalledWith(50, 1, { monthlyPrice: 2600000 })
    expect(contractsService.activate).toHaveBeenCalledWith(50, 1)
    expect(contractsService.expire).toHaveBeenCalledWith(50, 1)
    expect(contractsService.cancel).toHaveBeenCalledWith(50, 1)
  })

  it('delegates renter self-service operations with active user id', async () => {
    await controller.listMine(user, { page: 1, limit: 20 })
    await controller.getMine(user, 1)

    expect(contractsService.listMine).toHaveBeenCalledWith(50, { page: 1, limit: 20 })
    expect(contractsService.getMine).toHaveBeenCalledWith(50, 1)
  })
})
