import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import { TenantAccessService } from '@src/shared/modules/services/tenant-access.service'
import type { Prisma } from 'generated/prisma/client'
import type {
  TCreateUtilityMeterBodySchema,
  TListUtilityMetersQuerySchema,
  TUpdateUtilityMeterBodySchema,
  TUpdateUtilityMeterStatusBodySchema,
} from './model/utility-meters.model'
import { UtilityMetersRepository } from './repositories/utility-meters.repo'

/**
 * Service for tenant-scoped electricity and water meter configuration.
 */
@Injectable()
export class UtilityMetersService {
  constructor(
    private readonly utilityMetersRepository: UtilityMetersRepository,
    private readonly tenantAccessService: TenantAccessService,
  ) {}

  async list(userId: number, query: TListUtilityMetersQuerySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const { page, limit, skip } = normalizePagination(query)
    const where = this.buildListWhere(tenant.tenantId, query)
    const [meters, total] = await this.utilityMetersRepository.findMetersAndCount(where, skip, limit)
    return buildPaginatedResult(meters, total, page, limit)
  }

  async getById(userId: number, id: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    return this.getTenantMeterOrThrow(tenant.tenantId, id)
  }

  async create(userId: number, body: TCreateUtilityMeterBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const room = await this.utilityMetersRepository.findRoomForMeter(tenant.tenantId, body.roomId)
    if (!room) {
      throw new NotFoundException('Không tìm thấy phòng trong tenant hiện tại')
    }

    const existingMeter = await this.utilityMetersRepository.findMeterByRoomType(body.roomId, body.type)
    if (existingMeter) {
      throw new ConflictException('Phòng đã có đồng hồ cùng loại')
    }

    return this.utilityMetersRepository.createMeter({
      tenantId: tenant.tenantId,
      roomId: body.roomId,
      type: body.type,
      meterCode: body.meterCode,
      unit: body.unit ?? this.defaultUnitForType(body.type),
      status: body.status,
    })
  }

  async update(userId: number, id: number, body: TUpdateUtilityMeterBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    await this.getTenantMeterOrThrow(tenant.tenantId, id)
    return this.utilityMetersRepository.updateMeter(id, body)
  }

  async updateStatus(userId: number, id: number, body: TUpdateUtilityMeterStatusBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    await this.getTenantMeterOrThrow(tenant.tenantId, id)
    return this.utilityMetersRepository.updateMeter(id, { status: body.status })
  }

  private async getTenantMeterOrThrow(tenantId: number, id: number) {
    const meter = await this.utilityMetersRepository.findTenantMeter(tenantId, id)
    if (!meter) {
      throw new NotFoundException('Không tìm thấy đồng hồ trong tenant hiện tại')
    }
    return meter
  }

  private defaultUnitForType(type: 'ELECTRICITY' | 'WATER') {
    return type === 'ELECTRICITY' ? 'kWh' : 'm3'
  }

  private buildListWhere(tenantId: number, query: TListUtilityMetersQuerySchema): Prisma.UtilityMeterWhereInput {
    return {
      tenantId,
      ...(query.roomId ? { roomId: query.roomId } : {}),
      ...(query.propertyId ? { room: { propertyId: query.propertyId, deletedAt: null } } : { room: { deletedAt: null } }),
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
    }
  }
}
