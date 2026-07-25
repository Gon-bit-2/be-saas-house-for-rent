import { Injectable, NotFoundException } from '@nestjs/common'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import { TenantAccessService } from '@src/shared/modules/services/tenant-access.service'
import type { Prisma } from 'generated/prisma/client'
import type { TListRentersQuerySchema, TUpdateRenterProfileBodySchema } from './model/renters.model'
import { RentersRepository } from './repositories/renters.repo'

/**
 * Service for renter self-profile and tenant-scoped renter lookup.
 */
@Injectable()
export class RentersService {
  constructor(
    private readonly rentersRepository: RentersRepository,
    private readonly tenantAccessService: TenantAccessService,
  ) {}

  async getMe(userId: number) {
    const renter = await this.rentersRepository.findMe(userId)
    if (!renter?.renterProfile) {
      throw new NotFoundException('Không tìm thấy hồ sơ người thuê')
    }
    return renter
  }

  async updateMe(userId: number, body: TUpdateRenterProfileBodySchema) {
    await this.getMe(userId)
    return this.rentersRepository.updateProfile(userId, {
      dateOfBirth: body.dateOfBirth === undefined ? undefined : body.dateOfBirth,
      gender: body.gender === undefined ? undefined : body.gender,
      identityNumber: body.identityNumber === undefined ? undefined : (body.identityNumber ?? null),
      identityFrontUrl: body.identityFrontUrl === undefined ? undefined : (body.identityFrontUrl ?? null),
      identityBackUrl: body.identityBackUrl === undefined ? undefined : (body.identityBackUrl ?? null),
      permanentAddress: body.permanentAddress === undefined ? undefined : (body.permanentAddress ?? null),
      occupation: body.occupation === undefined ? undefined : (body.occupation ?? null),
      emergencyContactName:
        body.emergencyContactName === undefined ? undefined : (body.emergencyContactName ?? null),
      emergencyContactPhone:
        body.emergencyContactPhone === undefined ? undefined : (body.emergencyContactPhone ?? null),
    })
  }

  async listForLandlord(userId: number, query: TListRentersQuerySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const { page, limit, skip } = normalizePagination(query)
    const where = this.buildTenantRenterWhere(tenant.tenantId, query)
    const [renters, total] = await this.rentersRepository.findManyAndCount(where, skip, limit)
    return buildPaginatedResult(renters, total, page, limit)
  }

  async getForLandlord(userId: number, renterId: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const renter = await this.rentersRepository.findTenantRenter(tenant.tenantId, renterId)
    if (!renter) {
      throw new NotFoundException('Không tìm thấy người thuê trong tenant này')
    }
    return renter
  }

  private buildTenantRenterWhere(tenantId: number, query: TListRentersQuerySchema): Prisma.UserWhereInput {
    const searchFilter: Prisma.UserWhereInput[] = query.search
      ? [
          {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' as const } },
              { email: { contains: query.search, mode: 'insensitive' as const } },
              { phone: { contains: query.search, mode: 'insensitive' as const } },
            ],
          },
        ]
      : []

    return {
      deletedAt: null,
      status: 'ACTIVE',
      renterProfile: {
        is: {
          ...(query.verificationStatus ? { verificationStatus: query.verificationStatus } : {}),
        },
      },
      AND: [
        {
          OR: [{ rentalRequests: { some: { tenantId } } }, { viewingAppointments: { some: { tenantId } } }],
        },
        ...searchFilter,
      ],
    }
  }
}
