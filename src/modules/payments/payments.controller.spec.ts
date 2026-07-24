import { AuthType } from '@src/common/constants/auth.constant'
import { AUTH_TYPE_KEY } from '@src/common/decorators/decorators/auth.decorator'
import roleName from '@src/common/constants/role.constant'
import { ROLES_KEY } from '@src/common/decorators/decorators/roles.decorator'

jest.mock('./payments.service', () => ({ PaymentsService: class PaymentsService {} }))
const { PaymentsController } = require('./payments.controller') as typeof import('./payments.controller')

describe('PaymentsController', () => {
  let controller: import('./payments.controller').PaymentsController
  let paymentsService: Record<string, jest.Mock>
  const user = { userId: 50, roleId: 'TENANT', roleName: 'TENANT' }

  beforeEach(() => {
    paymentsService = {
      getMyPaymentQr: jest.fn(),
      createMyPaymentQr: jest.fn(),
      submitMyConfirmation: jest.fn(),
      listForLandlord: jest.fn(),
      getForLandlord: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
      handlePayosWebhook: jest.fn(),
    }
    controller = new PaymentsController(paymentsService as never)
  })

  it('uses renter, landlord and public webhook guards', () => {
    expect(Reflect.getMetadata(ROLES_KEY, PaymentsController.prototype.getMyPaymentQr)).toEqual([roleName.TENANT])
    expect(Reflect.getMetadata(ROLES_KEY, PaymentsController.prototype.createMyPaymentQr)).toEqual([roleName.TENANT])
    expect(Reflect.getMetadata(ROLES_KEY, PaymentsController.prototype.submitMyConfirmation)).toEqual([roleName.TENANT])
    expect(Reflect.getMetadata(ROLES_KEY, PaymentsController.prototype.listForLandlord)).toEqual([
      roleName.LANDLORD,
      roleName.MANAGER,
      roleName.ACCOUNTANT,
    ])
    expect(Reflect.getMetadata(AUTH_TYPE_KEY, PaymentsController.prototype.handlePayosWebhook)).toEqual({
      authTypes: AuthType.None,
      options: { condition: 'And' },
    })
  })

  it('delegates renter payment operations with active user id', async () => {
    await controller.getMyPaymentQr(user, 1)
    await controller.createMyPaymentQr(user, 1, {})
    await controller.submitMyConfirmation(user, 1, { amount: 100000 })

    expect(paymentsService.getMyPaymentQr).toHaveBeenCalledWith(50, 1)
    expect(paymentsService.createMyPaymentQr).toHaveBeenCalledWith(50, 1)
    expect(paymentsService.submitMyConfirmation).toHaveBeenCalledWith(50, 1, { amount: 100000 })
  })

  it('delegates landlord review operations with active user id', async () => {
    await controller.listForLandlord(user, { page: 1, limit: 20, status: 'PENDING' })
    await controller.getForLandlord(user, 3)
    await controller.approve(user, 3, { landlordNote: 'ok' })
    await controller.reject(user, 3, { landlordNote: 'sai so tien' })

    expect(paymentsService.listForLandlord).toHaveBeenCalledWith(50, { page: 1, limit: 20, status: 'PENDING' })
    expect(paymentsService.getForLandlord).toHaveBeenCalledWith(50, 3)
    expect(paymentsService.approve).toHaveBeenCalledWith(50, 3, { landlordNote: 'ok' })
    expect(paymentsService.reject).toHaveBeenCalledWith(50, 3, { landlordNote: 'sai so tien' })
  })
})