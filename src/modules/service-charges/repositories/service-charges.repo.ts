import { Injectable } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import type { Prisma } from 'generated/prisma/client'

export const serviceCatalogSelect = {
  id: true,
  tenantId: true,
  code: true,
  name: true,
  description: true,
  itemType: true,
  defaultUnitPrice: true,
  unitLabel: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { assignments: true } },
} satisfies Prisma.ServiceCatalogItemSelect

export const serviceAssignmentSelect = {
  id: true,
  tenantId: true,
  serviceItemId: true,
  roomId: true,
  contractId: true,
  quantity: true,
  unitPrice: true,
  startsAt: true,
  endsAt: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  serviceItem: { select: serviceCatalogSelect },
  room: { select: { id: true, roomCode: true, title: true, propertyId: true } },
  contract: { select: { id: true, contractCode: true, status: true, roomId: true } },
} satisfies Prisma.ServiceAssignmentSelect

@Injectable()
export class ServiceChargesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCatalogAndCount(where: Prisma.ServiceCatalogItemWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.serviceCatalogItem.findMany({
        where,
        skip,
        take,
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        select: serviceCatalogSelect,
      }),
      this.prisma.serviceCatalogItem.count({ where }),
    ])
  }

  findAssignmentsAndCount(where: Prisma.ServiceAssignmentWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.serviceAssignment.findMany({
        where,
        skip,
        take,
        orderBy: [{ isActive: 'desc' }, { id: 'desc' }],
        select: serviceAssignmentSelect,
      }),
      this.prisma.serviceAssignment.count({ where }),
    ])
  }

  findTenantCatalogItem(tenantId: number, id: number) {
    return this.prisma.serviceCatalogItem.findFirst({ where: { id, tenantId }, select: serviceCatalogSelect })
  }

  findTenantAssignment(tenantId: number, id: number) {
    return this.prisma.serviceAssignment.findFirst({ where: { id, tenantId }, select: serviceAssignmentSelect })
  }

  findTenantRoom(tenantId: number, id: number) {
    return this.prisma.room.findFirst({ where: { id, tenantId, deletedAt: null }, select: { id: true } })
  }

  findTenantContract(tenantId: number, id: number) {
    return this.prisma.contract.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true, roomId: true },
    })
  }

  createCatalogItem(data: Prisma.ServiceCatalogItemUncheckedCreateInput) {
    return this.prisma.serviceCatalogItem.create({ data, select: serviceCatalogSelect })
  }

  updateCatalogItem(id: number, data: Prisma.ServiceCatalogItemUncheckedUpdateInput) {
    return this.prisma.serviceCatalogItem.update({ where: { id }, data, select: serviceCatalogSelect })
  }

  createAssignment(data: Prisma.ServiceAssignmentUncheckedCreateInput) {
    return this.prisma.serviceAssignment.create({ data, select: serviceAssignmentSelect })
  }

  updateAssignment(id: number, data: Prisma.ServiceAssignmentUncheckedUpdateInput) {
    return this.prisma.serviceAssignment.update({ where: { id }, data, select: serviceAssignmentSelect })
  }
}
