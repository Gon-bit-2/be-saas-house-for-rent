import { BadRequestException, NotFoundException } from '@nestjs/common'

jest.mock('@src/shared/modules/services/tenant-access.service', () => ({
  TenantAccessService: class TenantAccessService {},
}))
jest.mock('./repositories/properties.repo', () => ({ PropertiesRepository: class PropertiesRepository {} }))
const { PropertiesService } = require('./properties.service') as typeof import('./properties.service')

describe('PropertiesService', () => {
  let service: import('./properties.service').PropertiesService
  let propertiesRepository: Record<string, jest.Mock>
  let tenantAccessService: Record<string, jest.Mock>
  let locationsService: Record<string, jest.Mock>

  beforeEach(() => {
    propertiesRepository = {
      findManyAndCount: jest.fn(),
      findTenantProperty: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      countBlockingRoomsForProperty: jest.fn(),
      softDeleteProperty: jest.fn(),
      findFloorsByProperty: jest.fn(),
      findTenantFloor: jest.fn(),
      createFloor: jest.fn(),
      updateFloor: jest.fn(),
      countRoomsForFloor: jest.fn(),
      deleteFloor: jest.fn(),
    }
    tenantAccessService = {
      getActiveTenantContext: jest
        .fn()
        .mockResolvedValue({ tenantId: 10, userId: 99, memberId: 1, roleId: 'LANDLORD' }),
    }
    locationsService = { resolvePropertyLocation: jest.fn() }
    service = new PropertiesService(
      propertiesRepository as never,
      tenantAccessService as never,
      locationsService as never,
    )
  })

  it('derives official names and coordinates for a coded location', async () => {
    propertiesRepository.create.mockResolvedValue({ id: 1 })
    locationsService.resolvePropertyLocation.mockResolvedValue({
      provinceCode: '01',
      province: 'Thành phố Hà Nội',
      district: null,
      wardCode: '00004',
      ward: 'Phường Ba Đình',
      addressDetail: '1 Phan Đình Phùng, Hà Nội',
      latitude: 21.04,
      longitude: 105.84,
    })

    await service.create(99, {
      name: 'Nhà Ba Đình',
      type: 'HOUSE',
      addressDetail: 'ignored',
      status: 'ACTIVE',
      location: {
        provinceCode: '01',
        wardCode: '00004',
        placeId: 'goong-place',
        sessionToken: 'session-token',
      },
    })

    expect(propertiesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        provinceCode: '01',
        wardCode: '00004',
        province: 'Thành phố Hà Nội',
        district: null,
        latitude: 21.04,
        longitude: 105.84,
      }),
    )
  })

  it('creates a property under the active tenant context', async () => {
    propertiesRepository.create.mockResolvedValue({ id: 1 })

    await service.create(99, {
      name: 'Nha A',
      type: 'HOUSE',
      province: 'Ha Noi',
      district: 'Cau Giay',
      ward: 'Dich Vong',
      addressDetail: '1 Xuan Thuy',
      status: 'ACTIVE',
    })

    expect(propertiesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 10, createdById: 99, name: 'Nha A' }),
    )
  })

  it('throws when tenant property is not found', async () => {
    propertiesRepository.findTenantProperty.mockResolvedValue(null)

    await expect(service.getById(99, 404)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('blocks soft delete when occupied or reserved rooms exist', async () => {
    propertiesRepository.findTenantProperty.mockResolvedValue({ id: 1 })
    propertiesRepository.countBlockingRoomsForProperty.mockResolvedValue(1)

    await expect(service.softDelete(99, 1)).rejects.toBeInstanceOf(BadRequestException)
    expect(propertiesRepository.softDeleteProperty).not.toHaveBeenCalled()
  })

  it('blocks deleting a floor that still has rooms', async () => {
    propertiesRepository.findTenantProperty.mockResolvedValue({ id: 1 })
    propertiesRepository.findTenantFloor.mockResolvedValue({ id: 2 })
    propertiesRepository.countRoomsForFloor.mockResolvedValue(1)

    await expect(service.deleteFloor(99, 1, 2)).rejects.toBeInstanceOf(BadRequestException)
    expect(propertiesRepository.deleteFloor).not.toHaveBeenCalled()
  })
})
