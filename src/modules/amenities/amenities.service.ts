import { Injectable, NotFoundException } from '@nestjs/common'
import roleName from '@src/common/constants/role.constant'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import type { Prisma } from 'generated/prisma/client'
import type {
  TCreateAmenityBodySchema,
  TListAmenitiesQuerySchema,
  TUpdateAmenityBodySchema,
} from './model/amenities.model'
import { AmenitiesRepository } from './repositories/amenities.repo'

/**
 * Service for global amenity catalog management and landlord lookup.
 */
@Injectable()
export class AmenitiesService {
  constructor(private readonly amenitiesRepository: AmenitiesRepository) {}

  async list(query: TListAmenitiesQuerySchema, roleNameValue: string) {
    const { page, limit, skip } = normalizePagination(query)
    const where = this.buildListWhere(query, roleNameValue)
    const [amenities, total] = await this.amenitiesRepository.findManyAndCount(where, skip, limit)
    return buildPaginatedResult(amenities, total, page, limit)
  }

  async create(body: TCreateAmenityBodySchema, actorId: number) {
    return this.amenitiesRepository.create({
      name: body.name,
      icon: body.icon ?? null,
      category: body.category,
      isActive: body.isActive,
      createdById: actorId,
    })
  }

  async update(id: number, body: TUpdateAmenityBodySchema, actorId: number) {
    await this.getByIdOrThrow(id)
    return this.amenitiesRepository.update(id, {
      ...body,
      icon: body.icon === undefined ? undefined : (body.icon ?? null),
      updatedById: actorId,
    })
  }

  private async getByIdOrThrow(id: number) {
    const amenity = await this.amenitiesRepository.findById(id)
    if (!amenity) {
      throw new NotFoundException('Không tìm thấy tiện ích')
    }
    return amenity
  }

  private buildListWhere(query: TListAmenitiesQuerySchema, roleNameValue: string): Prisma.AmenityWhereInput {
    const isAdmin = roleNameValue === roleName.ADMIN
    return {
      ...(isAdmin ? (query.isActive === undefined ? {} : { isActive: query.isActive }) : { isActive: true }),
      ...(query.category ? { category: { contains: query.category, mode: 'insensitive' } } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { category: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }
  }
}
