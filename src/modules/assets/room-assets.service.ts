import { Injectable, NotFoundException } from '@nestjs/common'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import { TenantAccessService } from '@src/shared/modules/services/tenant-access.service'
import type { TCreateRoomAssetBody, TListRoomAssetsQuery, TUpdateRoomAssetBody } from './model/assets.model'
import { RoomAssetsRepository } from './repositories/room-assets.repo'

@Injectable()
export class RoomAssetsService {
  constructor(
    private readonly repository: RoomAssetsRepository,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  async list(userId: number, roomId: number, query: TListRoomAssetsQuery) {
    const tenant = await this.tenantAccess.getActiveTenantContext(userId)
    if (!(await this.repository.getRoom(tenant.tenantId, roomId))) throw new NotFoundException('Không tìm thấy phòng')
    const { page, limit, skip } = normalizePagination(query)
    const [data, total] = await this.repository.findMany(
      {
        tenantId: tenant.tenantId,
        roomId,
        deletedAt: null,
        ...(query.condition ? { condition: query.condition } : {}),
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
      },
      skip,
      limit,
    )
    return buildPaginatedResult(data, total, page, limit)
  }

  async getById(userId: number, id: number) {
    const tenant = await this.tenantAccess.getActiveTenantContext(userId)
    const asset = await this.repository.findById(tenant.tenantId, id)
    if (!asset) throw new NotFoundException('Không tìm thấy tài sản phòng')
    return asset
  }

  async create(userId: number, roomId: number, body: TCreateRoomAssetBody) {
    const tenant = await this.tenantAccess.getActiveTenantContext(userId)
    if (!(await this.repository.getRoom(tenant.tenantId, roomId))) throw new NotFoundException('Không tìm thấy phòng')
    if (!(await this.repository.getCategory(tenant.tenantId, body.categoryId)))
      throw new NotFoundException('Không tìm thấy danh mục tài sản')
    return this.repository.create(tenant.tenantId, roomId, userId, {
      ...body,
      description: body.description ?? null,
      imageUrl: body.imageUrl ?? null,
    })
  }

  async update(userId: number, id: number, body: TUpdateRoomAssetBody) {
    const tenant = await this.tenantAccess.getActiveTenantContext(userId)
    if (!(await this.repository.findById(tenant.tenantId, id)))
      throw new NotFoundException('Không tìm thấy tài sản phòng')
    if (body.categoryId && !(await this.repository.getCategory(tenant.tenantId, body.categoryId)))
      throw new NotFoundException('Không tìm thấy danh mục tài sản')
    return this.repository.update(tenant.tenantId, id, userId, { ...body })
  }

  async delete(userId: number, id: number) {
    const tenant = await this.tenantAccess.getActiveTenantContext(userId)
    if (!(await this.repository.findById(tenant.tenantId, id)))
      throw new NotFoundException('Không tìm thấy tài sản phòng')
    return this.repository.delete(tenant.tenantId, id, userId)
  }
}
