import roleName from '@src/common/constants/role.constant'
import { ROLES_KEY } from '@src/common/decorators/decorators/roles.decorator'

jest.mock('./invoices.service', () => ({ InvoicesService: class InvoicesService {} }))
const { InvoicesController } = require('./invoices.controller') as typeof import('./invoices.controller')

describe('InvoicesController', () => {
  let controller: import('./invoices.controller').InvoicesController
  let invoicesService: Record<string, jest.Mock>
  const user = { userId: 50, roleId: 'ACCOUNTANT', roleName: 'ACCOUNTANT' }

  beforeEach(() => {
    invoicesService = {
      listMine: jest.fn(),
      getMine: jest.fn(),
      listDebts: jest.fn(),
      listForLandlord: jest.fn(),
      getForLandlord: jest.fn(),
      create: jest.fn(),
      updateDraft: jest.fn(),
      issue: jest.fn(),
      cancel: jest.fn(),
      markOverdue: jest.fn(),
    }
    controller = new InvoicesController(invoicesService as never)
  })

  it('uses tenant role for renter routes and owner/accountant roles for invoice routes', () => {
    expect(Reflect.getMetadata(ROLES_KEY, InvoicesController.prototype.listMine)).toEqual([roleName.TENANT])
    expect(Reflect.getMetadata(ROLES_KEY, InvoicesController.prototype.getMine)).toEqual([roleName.TENANT])
    expect(Reflect.getMetadata(ROLES_KEY, InvoicesController.prototype.listDebts)).toEqual([
      roleName.LANDLORD,
      roleName.MANAGER,
      roleName.ACCOUNTANT,
    ])
    expect(Reflect.getMetadata(ROLES_KEY, InvoicesController.prototype.create)).toEqual([
      roleName.LANDLORD,
      roleName.MANAGER,
      roleName.ACCOUNTANT,
    ])
  })

  it('delegates owner invoice operations with active user id', async () => {
    const query = { page: 1, limit: 20, status: 'UNPAID' as const }
    const body = {
      contractId: 7,
      billingMonth: new Date('2026-07-01T00:00:00.000Z'),
      status: 'DRAFT' as const,
      extraItems: [],
    }

    await controller.listDebts(user, { page: 1, limit: 20, status: 'OPEN' })
    await controller.listForLandlord(user, query)
    await controller.getForLandlord(user, 1)
    await controller.create(user, body)
    await controller.updateDraft(user, 1, { note: 'Cap nhat' })
    await controller.issue(user, 1)
    await controller.cancel(user, 1)
    await controller.markOverdue(user, 1)

    expect(invoicesService.listDebts).toHaveBeenCalledWith(50, { page: 1, limit: 20, status: 'OPEN' })
    expect(invoicesService.listForLandlord).toHaveBeenCalledWith(50, query)
    expect(invoicesService.getForLandlord).toHaveBeenCalledWith(50, 1)
    expect(invoicesService.create).toHaveBeenCalledWith(50, body)
    expect(invoicesService.updateDraft).toHaveBeenCalledWith(50, 1, { note: 'Cap nhat' })
    expect(invoicesService.issue).toHaveBeenCalledWith(50, 1)
    expect(invoicesService.cancel).toHaveBeenCalledWith(50, 1)
    expect(invoicesService.markOverdue).toHaveBeenCalledWith(50, 1)
  })

  it('delegates renter self-service operations with active user id', async () => {
    await controller.listMine(user, { page: 1, limit: 20 })
    await controller.getMine(user, 1)

    expect(invoicesService.listMine).toHaveBeenCalledWith(50, { page: 1, limit: 20 })
    expect(invoicesService.getMine).toHaveBeenCalledWith(50, 1)
  })
})
