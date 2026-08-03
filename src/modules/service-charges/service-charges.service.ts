import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import { TenantAccessService } from '@src/shared/modules/services/tenant-access.service'
import type { Prisma } from 'generated/prisma/client'
import type {
  TCreateServiceAssignmentBody,
  TCreateServiceCatalogItemBody,
  TListServiceAssignmentsQuery,
  TListServiceCatalogQuery,
  TUpdateServiceAssignmentBody,
  TUpdateServiceCatalogItemBody,
} from './model/service-charges.model'
import { ServiceChargesRepository } from './repositories/service-charges.repo'

@Injectable()
export class ServiceChargesService {
  constructor(
    private readonly repository: ServiceChargesRepository,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  async listCatalog(userId: number, query: TListServiceCatalogQuery) {
    const tenant = await this.tenantAccess.getActiveTenantContext(userId)
    const { page, limit, skip } = normalizePagination(query)
    const where: Prisma.ServiceCatalogItemWhereInput = {
      tenantId: tenant.tenantId,
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }
    const [data, total] = await this.repository.findCatalogAndCount(where, skip, limit)
    return buildPaginatedResult(data, total, page, limit)
  }

  async createCatalogItem(userId: number, body: TCreateServiceCatalogItemBody) {
    const tenant = await this.tenantAccess.getActiveTenantContext(userId)
    return this.repository.createCatalogItem({
      tenantId: tenant.tenantId,
      code: body.code.toUpperCase(),
      name: body.name,
      description: body.description ?? null,
      itemType: body.itemType,
      defaultUnitPrice: body.defaultUnitPrice,
      unitLabel: body.unitLabel,
      isActive: body.isActive,
    })
  }

  async updateCatalogItem(userId: number, id: number, body: TUpdateServiceCatalogItemBody) {
    const tenant = await this.tenantAccess.getActiveTenantContext(userId)
    if (!(await this.repository.findTenantCatalogItem(tenant.tenantId, id))) {
      throw new NotFoundException('Không tìm thấy phí dịch vụ trong tenant hiện tại')
    }
    return this.repository.updateCatalogItem(id, { ...body, code: body.code?.toUpperCase() })
  }

  async listAssignments(userId: number, query: TListServiceAssignmentsQuery) {
    const tenant = await this.tenantAccess.getActiveTenantContext(userId)
    const { page, limit, skip } = normalizePagination(query)
    const where: Prisma.ServiceAssignmentWhereInput = {
      tenantId: tenant.tenantId,
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.serviceItemId ? { serviceItemId: query.serviceItemId } : {}),
      ...(query.roomId ? { roomId: query.roomId } : {}),
      ...(query.contractId ? { contractId: query.contractId } : {}),
    }
    const [data, total] = await this.repository.findAssignmentsAndCount(where, skip, limit)
    return buildPaginatedResult(data, total, page, limit)
  }

  async createAssignment(userId: number, body: TCreateServiceAssignmentBody) {
    const tenant = await this.tenantAccess.getActiveTenantContext(userId)
    await this.assertReferences(tenant.tenantId, body.serviceItemId, body.roomId ?? null, body.contractId ?? null)
    return this.repository.createAssignment({
      tenantId: tenant.tenantId,
      serviceItemId: body.serviceItemId,
      roomId: body.roomId ?? null,
      contractId: body.contractId ?? null,
      quantity: body.quantity,
      unitPrice: body.unitPrice ?? null,
      startsAt: body.startsAt ?? null,
      endsAt: body.endsAt ?? null,
      isActive: body.isActive,
    })
  }

  async updateAssignment(userId: number, id: number, body: TUpdateServiceAssignmentBody) {
    const tenant = await this.tenantAccess.getActiveTenantContext(userId)
    const current = await this.repository.findTenantAssignment(tenant.tenantId, id)
    if (!current) throw new NotFoundException('Không tìm thấy gán phí trong tenant hiện tại')

    const serviceItemId = body.serviceItemId ?? current.serviceItemId
    const roomId = body.roomId === undefined ? current.roomId : body.roomId
    const contractId = body.contractId === undefined ? current.contractId : body.contractId
    if (Boolean(roomId) === Boolean(contractId)) {
      throw new BadRequestException('Phải gán phí cho đúng một phòng hoặc một hợp đồng')
    }
    const startsAt = body.startsAt === undefined ? current.startsAt : body.startsAt
    const endsAt = body.endsAt === undefined ? current.endsAt : body.endsAt
    if (startsAt && endsAt && endsAt < startsAt)
      throw new BadRequestException('Ngày kết thúc không được trước ngày bắt đầu')

    await this.assertReferences(tenant.tenantId, serviceItemId, roomId, contractId)
    return this.repository.updateAssignment(id, body)
  }

  private async assertReferences(
    tenantId: number,
    serviceItemId: number,
    roomId: number | null,
    contractId: number | null,
  ) {
    const serviceItem = await this.repository.findTenantCatalogItem(tenantId, serviceItemId)
    if (!serviceItem || !serviceItem.isActive)
      throw new NotFoundException('Phí dịch vụ không tồn tại hoặc đã ngừng hoạt động')
    if (roomId && !(await this.repository.findTenantRoom(tenantId, roomId)))
      throw new NotFoundException('Không tìm thấy phòng trong tenant hiện tại')
    if (contractId && !(await this.repository.findTenantContract(tenantId, contractId)))
      throw new NotFoundException('Không tìm thấy hợp đồng trong tenant hiện tại')
  }
}
