import roleName from '@src/common/constants/role.constant'
import { ROLES_KEY } from '@src/common/decorators/decorators/roles.decorator'

jest.mock('./subscription-payments.service', () => ({
  SubscriptionPaymentsService: class SubscriptionPaymentsService {},
}))
const { SubscriptionPaymentsController } =
  require('./subscription-payments.controller') as typeof import('./subscription-payments.controller')

describe('SubscriptionPaymentsController', () => {
  const service = {
    getMine: jest.fn(),
    createCheckout: jest.fn(),
    listMine: jest.fn(),
    getMineById: jest.fn(),
    cancel: jest.fn(),
    list: jest.fn(),
    getById: jest.fn(),
  }
  const controller = new SubscriptionPaymentsController(service as never)
  const user = { userId: 99 } as never

  it('restricts self-service routes to landlords and reconciliation routes to admins', () => {
    expect(Reflect.getMetadata(ROLES_KEY, SubscriptionPaymentsController.prototype.createCheckout)).toEqual([
      roleName.LANDLORD,
    ])
    expect(Reflect.getMetadata(ROLES_KEY, SubscriptionPaymentsController.prototype.list)).toEqual([roleName.ADMIN])
  })

  it('delegates checkout creation with the active user id', async () => {
    await controller.createCheckout(user, { planId: 3, billingCycle: 'MONTHLY' })
    expect(service.createCheckout).toHaveBeenCalledWith(99, { planId: 3, billingCycle: 'MONTHLY' })
  })
})
