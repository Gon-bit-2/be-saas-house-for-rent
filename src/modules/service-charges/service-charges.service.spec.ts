import { BadRequestException, NotFoundException } from '@nestjs/common'

jest.mock('@src/shared/modules/services/tenant-access.service', () => ({
  TenantAccessService: class TenantAccessService {},
}))
jest.mock('./repositories/service-charges.repo', () => ({
  ServiceChargesRepository: class ServiceChargesRepository {},
}))
import { ServiceChargesService } from './service-charges.service'

describe('ServiceChargesService', () => {
  let service: ServiceChargesService
  let repository: Record<string, jest.Mock>

  beforeEach(() => {
    repository = {
      findCatalogAndCount: jest.fn(),
      findAssignmentsAndCount: jest.fn(),
      findTenantCatalogItem: jest.fn(),
      findTenantAssignment: jest.fn(),
      findTenantRoom: jest.fn(),
      findTenantContract: jest.fn(),
      createCatalogItem: jest.fn(),
      updateCatalogItem: jest.fn(),
      createAssignment: jest.fn(),
      updateAssignment: jest.fn(),
    }
    const tenantAccess = {
      getActiveTenantContext: jest.fn().mockResolvedValue({ tenantId: 10, userId: 50, roleId: 'LANDLORD' }),
    }
    service = new ServiceChargesService(repository as never, tenantAccess as never)
  })

  it('forces tenant scope when listing catalog items', async () => {
    repository.findCatalogAndCount.mockResolvedValue([[{ id: 1 }], 1])

    const result = await service.listCatalog(50, { page: 1, limit: 20, isActive: true, search: 'xe' })

    expect(repository.findCatalogAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 10, isActive: true }),
      0,
      20,
    )
    expect(result.meta.total).toBe(1)
  })

  it('rejects an assignment that references a catalog item from another tenant', async () => {
    repository.findTenantCatalogItem.mockResolvedValue(null)

    await expect(
      service.createAssignment(50, {
        serviceItemId: 99,
        roomId: 5,
        quantity: 1,
        isActive: true,
      }),
    ).rejects.toBeInstanceOf(NotFoundException)
    expect(repository.createAssignment).not.toHaveBeenCalled()
  })

  it('rejects update resulting in both room and contract targets', async () => {
    repository.findTenantAssignment.mockResolvedValue({
      id: 1,
      serviceItemId: 3,
      roomId: 5,
      contractId: null,
      startsAt: null,
      endsAt: null,
    })

    await expect(service.updateAssignment(50, 1, { contractId: 7 })).rejects.toBeInstanceOf(BadRequestException)
    expect(repository.updateAssignment).not.toHaveBeenCalled()
  })
})
