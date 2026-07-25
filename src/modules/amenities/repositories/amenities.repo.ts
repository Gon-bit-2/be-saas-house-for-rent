import { Injectable } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import type { Prisma } from 'generated/prisma/client'

export const amenitySelect = {
  id: true,
  name: true,
  icon: true,
  category: true,
  isActive: true,
  createdById: true,
  updatedById: true,
} satisfies Prisma.AmenitySelect

/**
 * Repository for global amenity catalog queries.
 */
@Injectable()
export class AmenitiesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findManyAndCount(where: Prisma.AmenityWhereInput, skip: number, take: number) {
    return this.prismaService.$transaction([
      this.prismaService.amenity.findMany({
        where,
        skip,
        take,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        select: amenitySelect,
      }),
      this.prismaService.amenity.count({ where }),
    ])
  }

  async findById(id: number) {
    return this.prismaService.amenity.findUnique({ where: { id }, select: amenitySelect })
  }

  async create(data: Prisma.AmenityUncheckedCreateInput) {
    return this.prismaService.amenity.create({ data, select: amenitySelect })
  }

  async update(id: number, data: Prisma.AmenityUncheckedUpdateInput) {
    return this.prismaService.amenity.update({ where: { id }, data, select: amenitySelect })
  }
}
