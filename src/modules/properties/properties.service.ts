import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import { TenantAccessService } from '@src/shared/modules/services/tenant-access.service'
import { CloudinaryService } from '@src/shared/modules/services/cloudinary.service'
import { LocationsService } from '@src/modules/locations/locations.service'
import type { Prisma } from 'generated/prisma/client'
import type {
  TCreateFloorBodySchema,
  TCreatePropertyBodySchema,
  TListPropertiesQuerySchema,
  TUpdateFloorBodySchema,
  TUpdatePropertyBodySchema,
  TUpdatePropertyStatusBodySchema,
} from './model/properties.model'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import { PropertiesRepository } from './repositories/properties.repo'

/**
 * Service containing tenant-scoped business rules for properties and floors.
 */
@Injectable()
export class PropertiesService {
  constructor(
    private readonly propertiesRepository: PropertiesRepository,
    private readonly tenantAccessService: TenantAccessService,
    private readonly locationsService: LocationsService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly prismaService: PrismaService,
  ) {}

  async list(userId: number, query: TListPropertiesQuerySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const { page, limit, skip } = normalizePagination(query)
    const where = this.buildListWhere(tenant.tenantId, query)
    const [properties, total] = await this.propertiesRepository.findManyAndCount(where, skip, limit)
    return buildPaginatedResult(properties, total, page, limit)
  }

  async getById(userId: number, id: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    return this.getTenantPropertyOrThrow(tenant.tenantId, id)
  }

  async create(userId: number, body: TCreatePropertyBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const location = body.location
      ? await this.locationsService.resolvePropertyLocation(body.location)
      : {
          province: body.province!,
          district: body.district!,
          ward: body.ward!,
          addressDetail: body.addressDetail,
          latitude: body.latitude,
          longitude: body.longitude,
        }
    const property = await this.propertiesRepository.create({
      tenantId: tenant.tenantId,
      name: body.name,
      type: body.type,
      ...location,
      description: body.description ?? null,
      verificationDocuments: body.verificationDocuments ?? [],
      status: body.status,
      createdById: userId,
    })

    // Cập nhật thông tin giấy tờ tùy thân của Tenant nếu có truyền lên
    if (body.idCardFrontUrl || body.idCardBackUrl) {
      await this.prismaService.tenant.update({
        where: { id: tenant.tenantId },
        data: {
          ...(body.idCardFrontUrl ? { idCardFrontUrl: body.idCardFrontUrl } : {}),
          ...(body.idCardBackUrl ? { idCardBackUrl: body.idCardBackUrl } : {}),
          // Chỉ cập nhật thành PENDING nếu họ chưa từng VERIFIED
          verificationStatus: {
            set: 'PENDING',
          },
        },
      })
    }

    if (body.floorsCount && body.floorsCount > 0) {
      const floorsToCreate = Array.from({ length: body.floorsCount }).map((_, index) => ({
        tenantId: tenant.tenantId,
        propertyId: property.id,
        name: `Tầng ${index + 1}`,
        floorNumber: index + 1,
      }))
      await this.propertiesRepository.createManyFloors(floorsToCreate)
    }

    return property
  }

  async update(userId: number, id: number, body: TUpdatePropertyBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    await this.getTenantPropertyOrThrow(tenant.tenantId, id)

    const { floorsCount, location, ...updateData } = body
    const resolvedLocation = location ? await this.locationsService.resolvePropertyLocation(location) : {}

    const updated = await this.propertiesRepository.update(id, {
      ...updateData,
      ...resolvedLocation,
      description: updateData.description === undefined ? undefined : (updateData.description ?? null),
      updatedById: userId,
    })

    if (floorsCount !== undefined) {
      const currentFloorsCount = await this.propertiesRepository.countFloorsForProperty(tenant.tenantId, id)
      if (floorsCount > currentFloorsCount) {
        const floorsToCreate: Prisma.FloorCreateManyInput[] = []
        for (let i = currentFloorsCount + 1; i <= floorsCount; i++) {
          floorsToCreate.push({
            tenantId: tenant.tenantId,
            propertyId: id,
            name: `Tầng ${i}`,
            floorNumber: i,
          })
        }
        await this.propertiesRepository.createManyFloors(floorsToCreate)
      }
    }

    return updated
  }

  async updateStatus(userId: number, id: number, body: TUpdatePropertyStatusBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    await this.getTenantPropertyOrThrow(tenant.tenantId, id)
    return this.propertiesRepository.update(id, { status: body.status, updatedById: userId })
  }

  async softDelete(userId: number, id: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    await this.getTenantPropertyOrThrow(tenant.tenantId, id)
    const blockingRooms = await this.propertiesRepository.countBlockingRoomsForProperty(tenant.tenantId, id)
    if (blockingRooms > 0) {
      throw new BadRequestException('Không thể xóa nhà trọ đang có phòng đã thuê hoặc đặt cọc')
    }

    return this.propertiesRepository.softDeleteProperty(tenant.tenantId, id, userId)
  }

  async listFloors(userId: number, propertyId: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    await this.getTenantPropertyOrThrow(tenant.tenantId, propertyId)
    return this.propertiesRepository.findFloorsByProperty(tenant.tenantId, propertyId)
  }

  async createFloor(userId: number, propertyId: number, body: TCreateFloorBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    await this.getTenantPropertyOrThrow(tenant.tenantId, propertyId)
    return this.propertiesRepository.createFloor({
      tenantId: tenant.tenantId,
      propertyId,
      name: body.name,
      floorNumber: body.floorNumber,
    })
  }

  async updateFloor(userId: number, propertyId: number, floorId: number, body: TUpdateFloorBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    await this.getTenantPropertyOrThrow(tenant.tenantId, propertyId)
    await this.getTenantFloorOrThrow(tenant.tenantId, propertyId, floorId)
    return this.propertiesRepository.updateFloor(floorId, body)
  }

  async deleteFloor(userId: number, propertyId: number, floorId: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    await this.getTenantPropertyOrThrow(tenant.tenantId, propertyId)
    await this.getTenantFloorOrThrow(tenant.tenantId, propertyId, floorId)
    const roomCount = await this.propertiesRepository.countRoomsForFloor(tenant.tenantId, propertyId, floorId)
    if (roomCount > 0) {
      throw new BadRequestException('Không thể xóa tầng đang có phòng')
    }
    return this.propertiesRepository.deleteFloor(floorId)
  }

  async uploadCoverImage(userId: number, propertyId: number, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn ảnh bìa')
    }

    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const property = await this.getTenantPropertyOrThrow(tenant.tenantId, propertyId)

    // Nếu đã có ảnh bìa cũ, xóa khỏi Cloudinary để dọn dẹp
    if (property.coverImagePublicId) {
      await this.cloudinaryService.deleteImage(property.coverImagePublicId).catch(() => undefined)
    }

    // Upload ảnh mới
    const uploadResult = await this.cloudinaryService.uploadImage(file, `properties/${tenant.tenantId}/${propertyId}`)

    // Cập nhật record Property
    return this.propertiesRepository.update(propertyId, {
      coverImageUrl: uploadResult.url,
      coverImagePublicId: uploadResult.publicId,
      updatedById: userId,
    })
  }

  async uploadVerificationImages(userId: number, files: Express.Multer.File[]) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const uploadPromises = files.map((file) => 
      this.cloudinaryService.uploadImage(file, `properties/verification/${tenant.tenantId}`)
    )
    const results = await Promise.all(uploadPromises)
    return results.map((r) => r.url)
  }

  private async getTenantPropertyOrThrow(tenantId: number, id: number) {
    const property = await this.propertiesRepository.findTenantProperty(tenantId, id)
    if (!property) {
      throw new NotFoundException('Không tìm thấy nhà trọ')
    }
    return property
  }

  private async getTenantFloorOrThrow(tenantId: number, propertyId: number, floorId: number) {
    const floor = await this.propertiesRepository.findTenantFloor(tenantId, propertyId, floorId)
    if (!floor) {
      throw new NotFoundException('Không tìm thấy tầng')
    }
    return floor
  }

  private buildListWhere(tenantId: number, query: TListPropertiesQuerySchema): Prisma.PropertyWhereInput {
    return {
      tenantId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.province ? { province: { contains: query.province, mode: 'insensitive' } } : {}),
      ...(query.provinceCode ? { provinceCode: query.provinceCode } : {}),
      ...(query.district ? { district: { contains: query.district, mode: 'insensitive' } } : {}),
      ...(query.ward ? { ward: { contains: query.ward, mode: 'insensitive' } } : {}),
      ...(query.wardCode ? { wardCode: query.wardCode } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { addressDetail: { contains: query.search, mode: 'insensitive' } },
              { province: { contains: query.search, mode: 'insensitive' } },
              { district: { contains: query.search, mode: 'insensitive' } },
              { ward: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }
  }
}
