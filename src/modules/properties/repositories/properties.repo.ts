import { Injectable } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import type { Prisma } from 'generated/prisma/client'

const floorSelect = {
  id: true,
  tenantId: true,
  propertyId: true,
  name: true,
  floorNumber: true,
  createdAt: true,
  _count: { select: { rooms: true } },
} satisfies Prisma.FloorSelect

export const propertySelect = {
  id: true,
  tenantId: true,
  name: true,
  type: true,
  province: true,
  district: true,
  ward: true,
  addressDetail: true,
  latitude: true,
  longitude: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  createdById: true,
  updatedById: true,
  deletedById: true,
  _count: { select: { floors: true, rooms: true } },
} satisfies Prisma.PropertySelect

export const propertyDetailSelect = {
  ...propertySelect,
  floors: {
    orderBy: [{ floorNumber: 'asc' }, { id: 'asc' }],
    select: floorSelect,
  },
} satisfies Prisma.PropertySelect

/**
 * Repository encapsulating Prisma queries for tenant-scoped property and floor management.
 */
@Injectable()
export class PropertiesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findManyAndCount(where: Prisma.PropertyWhereInput, skip: number, take: number) {
    return this.prismaService.$transaction([
      this.prismaService.property.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }],
        select: propertySelect,
      }),
      this.prismaService.property.count({ where }),
    ])
  }

  async findTenantProperty(tenantId: number, id: number) {
    return this.prismaService.property.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: propertyDetailSelect,
    })
  }

  async create(data: Prisma.PropertyUncheckedCreateInput) {
    return this.prismaService.property.create({ data, select: propertyDetailSelect })
  }

  async update(id: number, data: Prisma.PropertyUncheckedUpdateInput) {
    return this.prismaService.property.update({ where: { id }, data, select: propertyDetailSelect })
  }

  async countBlockingRoomsForProperty(tenantId: number, propertyId: number) {
    return this.prismaService.room.count({
      where: {
        tenantId,
        propertyId,
        deletedAt: null,
        status: { in: ['OCCUPIED', 'RESERVED'] },
      },
    })
  }

  async softDeleteProperty(tenantId: number, id: number, actorId: number) {
    return this.prismaService.property.update({
      where: { id, tenantId },
      data: {
        deletedAt: new Date(),
        deletedById: actorId,
      },
      select: propertyDetailSelect,
    })
  }

  async findFloorsByProperty(tenantId: number, propertyId: number) {
    return this.prismaService.floor.findMany({
      where: { tenantId, propertyId, property: { deletedAt: null } },
      orderBy: [{ floorNumber: 'asc' }, { id: 'asc' }],
      select: floorSelect,
    })
  }

  async findTenantFloor(tenantId: number, propertyId: number, floorId: number) {
    return this.prismaService.floor.findFirst({
      where: { id: floorId, tenantId, propertyId, property: { deletedAt: null } },
      select: floorSelect,
    })
  }

  async createFloor(data: Prisma.FloorUncheckedCreateInput) {
    return this.prismaService.floor.create({ data, select: floorSelect })
  }

  async updateFloor(id: number, data: Prisma.FloorUncheckedUpdateInput) {
    return this.prismaService.floor.update({ where: { id }, data, select: floorSelect })
  }

  async countRoomsForFloor(tenantId: number, propertyId: number, floorId: number) {
    return this.prismaService.room.count({ where: { tenantId, propertyId, floorId, deletedAt: null } })
  }

  async deleteFloor(id: number) {
    return this.prismaService.floor.delete({ where: { id }, select: floorSelect })
  }
}
