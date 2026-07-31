import { NotFoundException } from '@nestjs/common'
import { RoomAssetsService } from './room-assets.service'

jest.mock('@src/shared/modules/services/tenant-access.service', () => ({
  TenantAccessService: class TenantAccessService {},
}))
jest.mock('./repositories/room-assets.repo', () => ({ RoomAssetsRepository: class RoomAssetsRepository {} }))

describe('RoomAssetsService', () => {
  let service: RoomAssetsService
  let repository: Record<string, jest.Mock>

  beforeEach(() => {
    repository = {
      getRoom: jest.fn(),
      getCategory: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    }
    const tenantAccess = { getActiveTenantContext: jest.fn().mockResolvedValue({ tenantId: 10 }) }
    service = new RoomAssetsService(repository as never, tenantAccess as never)
  })

  it('does not expose an asset from another tenant', async () => {
    repository.findById.mockResolvedValue(null)
    await expect(service.getById(50, 7)).rejects.toBeInstanceOf(NotFoundException)
    expect(repository.findById).toHaveBeenCalledWith(10, 7)
  })

  it('validates the category in the active tenant before creating', async () => {
    repository.getRoom.mockResolvedValue({ id: 2 })
    repository.getCategory.mockResolvedValue(null)
    await expect(
      service.create(50, 2, { categoryId: 9, name: 'Tu', quantity: 1, condition: 'GOOD' }),
    ).rejects.toBeInstanceOf(NotFoundException)
    expect(repository.create).not.toHaveBeenCalled()
  })
})
