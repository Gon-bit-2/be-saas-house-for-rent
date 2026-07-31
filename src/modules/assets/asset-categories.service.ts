import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import { TenantAccessService } from '@src/shared/modules/services/tenant-access.service'
import type {
  TCreateAssetCategoryBody,
  TListAssetCategoriesQuery,
  TUpdateAssetCategoryBody,
} from './model/assets.model'
import { AssetCategoriesRepository } from './repositories/asset-categories.repo'

@Injectable()
export class AssetCategoriesService {
  constructor(
    private readonly repository: AssetCategoriesRepository,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  async list(userId: number, query: TListAssetCategoriesQuery) {
    const tenant = await this.tenantAccess.getActiveTenantContext(userId)
    const { page, limit, skip } = normalizePagination(query)
    const [data, total] = await this.repository.findMany(
      {
        tenantId: tenant.tenantId,
        deletedAt: null,
        ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
      },
      skip,
      limit,
    )
    return buildPaginatedResult(data, total, page, limit)
  }

  async getById(userId: number, id: number) {
    const tenant = await this.tenantAccess.getActiveTenantContext(userId)
    const category = await this.repository.findById(tenant.tenantId, id)
    if (!category) throw new NotFoundException('Không tìm thấy danh mục tài sản')
    return category
  }

  async create(userId: number, body: TCreateAssetCategoryBody) {
    const tenant = await this.tenantAccess.getActiveTenantContext(userId)
    try {
      return await this.repository.create(tenant.tenantId, userId, {
        name: body.name,
        description: body.description ?? null,
      })
    } catch (error) {
      if (this.isUnique(error)) throw new ConflictException('Tên danh mục đã tồn tại trong tenant')
      throw error
    }
  }

  async update(userId: number, id: number, body: TUpdateAssetCategoryBody) {
    const tenant = await this.tenantAccess.getActiveTenantContext(userId)
    if (!(await this.repository.findById(tenant.tenantId, id)))
      throw new NotFoundException('Không tìm thấy danh mục tài sản')
    try {
      return await this.repository.update(tenant.tenantId, id, userId, {
        name: body.name,
        description: body.description === undefined ? undefined : body.description,
      })
    } catch (error) {
      if (this.isUnique(error)) throw new ConflictException('Tên danh mục đã tồn tại trong tenant')
      throw error
    }
  }

  async delete(userId: number, id: number) {
    const tenant = await this.tenantAccess.getActiveTenantContext(userId)
    const category = await this.repository.findById(tenant.tenantId, id)
    if (!category) throw new NotFoundException('Không tìm thấy danh mục tài sản')
    if (category._count.roomAssets > 0) throw new ConflictException('Không thể xóa danh mục đang có tài sản sử dụng')
    return this.repository.delete(tenant.tenantId, id, userId)
  }

  private isUnique(error: unknown) {
    return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
  }
}
