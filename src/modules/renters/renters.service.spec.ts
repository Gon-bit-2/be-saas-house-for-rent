import { NotFoundException } from '@nestjs/common'

jest.mock('@src/shared/modules/services/tenant-access.service', () => ({ TenantAccessService: class TenantAccessService {} }))
jest.mock('./repositories/renters.repo', () => ({ RentersRepository: class RentersRepository {} }))
const { RentersService } = require('./renters.service') as typeof import('./renters.service')

describe('RentersService', () => {
  let service: import('./renters.service').RentersService
  let rentersRepository: Record<string, jest.Mock>
  let tenantAccessService: Record<string, jest.Mock>

  beforeEach(() => {
    rentersRepository = {
      findMe: jest.fn(),
      updateProfile: jest.fn(),
      findManyAndCount: jest.fn(),
      findTenantRenter: jest.fn(),
    }
    tenantAccessService = {
      getActiveTenantContext: jest.fn().mockResolvedValue({ tenantId: 10, userId: 50, memberId: 1, roleId: 'LANDLORD' }),
    }
    service = new RentersService(rentersRepository as never, tenantAccessService as never)
  })

  it('updates renter self profile after confirming profile exists', async () => {
    rentersRepository.findMe.mockResolvedValue({ id: 99, renterProfile: { id: 1 } })
    rentersRepository.updateProfile.mockResolvedValue({ id: 99 })

    await service.updateMe(99, { occupation: 'Developer', identityNumber: null })

    expect(rentersRepository.updateProfile).toHaveBeenCalledWith(99, {
      dateOfBirth: undefined,
      gender: undefined,
      identityNumber: null,
      identityFrontUrl: undefined,
      identityBackUrl: undefined,
      permanentAddress: undefined,
      occupation: 'Developer',
      emergencyContactName: undefined,
      emergencyContactPhone: undefined,
    })
  })

  it('throws when tenant user has no renter profile', async () => {
    rentersRepository.findMe.mockResolvedValue({ id: 99, renterProfile: null })

    await expect(service.getMe(99)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('lists renters only through current tenant relationships', async () => {
    rentersRepository.findManyAndCount.mockResolvedValue([[{ id: 99 }], 1])

    await service.listForLandlord(50, { page: 1, limit: 20, search: 'An' })

    expect(rentersRepository.findManyAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        AND: expect.arrayContaining([
          { OR: [{ rentalRequests: { some: { tenantId: 10 } } }, { viewingAppointments: { some: { tenantId: 10 } } }] },
        ]),
      }),
      0,
      20,
    )
  })

  it('throws when landlord requests unrelated renter detail', async () => {
    rentersRepository.findTenantRenter.mockResolvedValue(null)

    await expect(service.getForLandlord(50, 99)).rejects.toBeInstanceOf(NotFoundException)
  })
})
