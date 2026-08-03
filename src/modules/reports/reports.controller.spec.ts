import roleName from '@src/common/constants/role.constant'
import { ROLES_KEY } from '@src/common/decorators/decorators/roles.decorator'
import { RESOURCE_RATE_LIMIT_KEY } from '@src/common/rate-limit/resource-rate-limit.decorator'

jest.mock('./reports.service', () => ({ ReportsService: class ReportsService {} }))
import { ReportsAdminController } from './reports-admin.controller'
import { ReportsController } from './reports.controller'

describe('Report controllers', () => {
  it('protects renter and admin operations with the expected metadata', () => {
    expect(Reflect.getMetadata(ROLES_KEY, ReportsController.prototype.create)).toEqual([roleName.TENANT])
    expect(Reflect.getMetadata(RESOURCE_RATE_LIMIT_KEY, ReportsController.prototype.create)).toBe('trust-write')
    expect(Reflect.getMetadata(ROLES_KEY, ReportsAdminController)).toEqual([roleName.ADMIN])
  })

  it('passes the exact actor role to report creation', async () => {
    const service = { create: jest.fn() }
    const controller = new ReportsController(service as never)
    const user = { userId: 40, roleName: 'TENANT' }
    const body = { targetType: 'ROOM' as const, targetId: '20', reason: 'Thông tin không chính xác' }

    await controller.create(user, body)
    expect(service.create).toHaveBeenCalledWith(40, 'TENANT', body)
  })
})
