import roleName from '@src/common/constants/role.constant'
import { AUTH_TYPE_KEY } from '@src/common/decorators/decorators/auth.decorator'
import { ROLES_KEY } from '@src/common/decorators/decorators/roles.decorator'
import { RESOURCE_RATE_LIMIT_KEY } from '@src/common/rate-limit/resource-rate-limit.decorator'

jest.mock('./reviews.service', () => ({ ReviewsService: class ReviewsService {} }))
import { ReviewsAdminController } from './reviews-admin.controller'
import { ReviewsPublicController } from './reviews-public.controller'
import { ReviewsController } from './reviews.controller'

describe('Review controllers', () => {
  it('protects renter and admin operations with the expected metadata', () => {
    expect(Reflect.getMetadata(ROLES_KEY, ReviewsController.prototype.create)).toEqual([roleName.TENANT])
    expect(Reflect.getMetadata(RESOURCE_RATE_LIMIT_KEY, ReviewsController.prototype.create)).toBe('trust-write')
    expect(Reflect.getMetadata(ROLES_KEY, ReviewsAdminController)).toEqual([roleName.ADMIN])
  })

  it('marks marketplace review routes as public', () => {
    expect(Reflect.getMetadata(AUTH_TYPE_KEY, ReviewsPublicController.prototype.listPublic)).toEqual(
      expect.objectContaining({ authTypes: 'None' }),
    )
    expect(Reflect.getMetadata(AUTH_TYPE_KEY, ReviewsPublicController.prototype.getSummary)).toEqual(
      expect.objectContaining({ authTypes: 'None' }),
    )
  })

  it('passes the exact actor role to review creation', async () => {
    const service = { create: jest.fn() }
    const controller = new ReviewsController(service as never)
    const user = { userId: 40, roleName: 'TENANT' }
    const body = {
      contractId: 30,
      rating: 5,
      content: 'Phòng sạch và dịch vụ tốt',
      cleanlinessScore: 5,
      locationScore: 4,
      priceScore: 4,
      serviceScore: 5,
    }

    await controller.create(user, body)
    expect(service.create).toHaveBeenCalledWith(40, 'TENANT', body)
  })
})
