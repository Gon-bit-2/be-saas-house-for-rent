import { ROLES_KEY } from '@src/common/decorators/decorators/roles.decorator'
import roleName from '@src/common/constants/role.constant'

jest.mock('./viewing-appointments.service', () => ({ ViewingAppointmentsService: class ViewingAppointmentsService {} }))
const { ViewingAppointmentsController } =
  require('./viewing-appointments.controller') as typeof import('./viewing-appointments.controller')

describe('ViewingAppointmentsController', () => {
  let controller: import('./viewing-appointments.controller').ViewingAppointmentsController
  let viewingAppointmentsService: Record<string, jest.Mock>
  const user = { userId: 99, roleId: 'TENANT', roleName: 'TENANT' }

  beforeEach(() => {
    viewingAppointmentsService = {
      listMine: jest.fn(),
      cancelMine: jest.fn(),
      listForLandlord: jest.fn(),
      updateStatus: jest.fn(),
    }
    controller = new ViewingAppointmentsController(viewingAppointmentsService as never)
  })

  it('uses tenant role for self routes and landlord/manager roles for schedule handling', () => {
    expect(Reflect.getMetadata(ROLES_KEY, ViewingAppointmentsController.prototype.listMine)).toEqual([roleName.TENANT])
    expect(Reflect.getMetadata(ROLES_KEY, ViewingAppointmentsController.prototype.cancelMine)).toEqual([
      roleName.TENANT,
    ])
    expect(Reflect.getMetadata(ROLES_KEY, ViewingAppointmentsController.prototype.listForLandlord)).toEqual([
      roleName.LANDLORD,
      roleName.MANAGER,
    ])
    expect(Reflect.getMetadata(ROLES_KEY, ViewingAppointmentsController.prototype.updateStatus)).toEqual([
      roleName.LANDLORD,
      roleName.MANAGER,
    ])
  })

  it('delegates renter and landlord appointment operations', async () => {
    await controller.listMine(user, { page: 1, limit: 20 })
    await controller.cancelMine(user, 3, {})
    await controller.listForLandlord(user, { page: 1, limit: 20, status: 'PENDING' })
    await controller.updateStatus(user, 3, { status: 'CONFIRMED' })

    expect(viewingAppointmentsService.listMine).toHaveBeenCalledWith(99, { page: 1, limit: 20 })
    expect(viewingAppointmentsService.cancelMine).toHaveBeenCalledWith(99, 3, {})
    expect(viewingAppointmentsService.listForLandlord).toHaveBeenCalledWith(99, {
      page: 1,
      limit: 20,
      status: 'PENDING',
    })
    expect(viewingAppointmentsService.updateStatus).toHaveBeenCalledWith(99, 3, { status: 'CONFIRMED' })
  })
})
