import { NotFoundException } from '@nestjs/common'

jest.mock('./repositories/amenities.repo', () => ({ AmenitiesRepository: class AmenitiesRepository {} }))
const { AmenitiesService } = require('./amenities.service') as typeof import('./amenities.service')

describe('AmenitiesService', () => {
  let service: import('./amenities.service').AmenitiesService
  let amenitiesRepository: Record<string, jest.Mock>

  beforeEach(() => {
    amenitiesRepository = {
      findManyAndCount: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    }
    service = new AmenitiesService(amenitiesRepository as never)
  })

  it('forces landlord amenity list to active items', async () => {
    amenitiesRepository.findManyAndCount.mockResolvedValue([[{ id: 1 }], 1])

    await service.list({ page: 1, limit: 10, isActive: false }, 'LANDLORD')

    expect(amenitiesRepository.findManyAndCount).toHaveBeenCalledWith(expect.objectContaining({ isActive: true }), 0, 10)
  })

  it('allows admin to filter inactive amenities', async () => {
    amenitiesRepository.findManyAndCount.mockResolvedValue([[{ id: 1 }], 1])

    await service.list({ page: 1, limit: 10, isActive: false }, 'ADMIN')

    expect(amenitiesRepository.findManyAndCount).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }), 0, 10)
  })

  it('creates and updates amenities with audit fields', async () => {
    amenitiesRepository.create.mockResolvedValue({ id: 1 })
    amenitiesRepository.findById.mockResolvedValue({ id: 1 })
    amenitiesRepository.update.mockResolvedValue({ id: 1 })

    await service.create({ name: 'Wifi', category: 'Tien nghi', icon: 'wifi', isActive: true }, 99)
    await service.update(1, { isActive: false }, 99)

    expect(amenitiesRepository.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Wifi', createdById: 99 }))
    expect(amenitiesRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({ isActive: false, updatedById: 99 }))
  })

  it('throws when updating a missing amenity', async () => {
    amenitiesRepository.findById.mockResolvedValue(null)

    await expect(service.update(404, { isActive: false }, 99)).rejects.toBeInstanceOf(NotFoundException)
  })
})
