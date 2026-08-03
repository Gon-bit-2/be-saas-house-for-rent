import { Injectable, NotFoundException } from '@nestjs/common'
import { BadRequestException, ConflictException } from '@nestjs/common'
import envConfig from '@src/config/env.config'
import { EmailService } from '@src/shared/modules/services/email.service'
import { HashingService } from '@src/shared/modules/services/hashing.service'
import { randomInt } from 'crypto'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import { TenantAccessService } from '@src/shared/modules/services/tenant-access.service'
import type { Prisma } from 'generated/prisma/client'
import type {
  TListRentalHistoryQuerySchema,
  TListRentersQuerySchema,
  TUpdateRenterProfileBodySchema,
} from './model/renters.model'
import type {
  TAcceptRenterInvitationBodySchema,
  TInviteRenterBodySchema,
  TUpdateRenterForLandlordBodySchema,
} from './model/renters.model'
import { RentersRepository } from './repositories/renters.repo'

/**
 * Service for renter self-profile and tenant-scoped renter lookup.
 */
@Injectable()
export class RentersService {
  constructor(
    private readonly rentersRepository: RentersRepository,
    private readonly tenantAccessService: TenantAccessService,
    private readonly hashingService: HashingService,
    private readonly emailService: EmailService,
  ) {}

  async invite(userId: number, body: TInviteRenterBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const email = body.email.trim().toLowerCase()
    const existingUser = await this.rentersRepository.findRegisteredUser(email, body.phone)
    if (existingUser) {
      throw new ConflictException('Email hoặc số điện thoại đã thuộc một tài khoản')
    }

    const code = randomInt(100000, 1000000).toString()
    const codeHash = await this.hashingService.hash(code)
    const invitation = await this.rentersRepository.createInvitation({
      tenantId: tenant.tenantId,
      email,
      fullName: body.fullName,
      phone: body.phone,
      codeHash,
      expiresAt: new Date(Date.now() + envConfig.RENTER_INVITATION_EXPIRE_MINUTES * 60_000),
      createdById: userId,
    })

    await this.emailService.sendOtpEmail({
      email,
      code,
      title: 'Mã xác nhận lời mời người thuê',
    })
    return invitation
  }

  async acceptInvitation(body: TAcceptRenterInvitationBodySchema) {
    const email = body.email.trim().toLowerCase()
    if (await this.rentersRepository.findRegisteredUser(email)) {
      throw new ConflictException('Email đã thuộc một tài khoản')
    }

    const invitation = await this.rentersRepository.findValidInvitation(email, new Date(), envConfig.OTP_MAX_ATTEMPTS)
    if (!invitation) {
      throw new BadRequestException('Lời mời không tồn tại, đã hết hạn hoặc vượt quá số lần thử')
    }

    const validCode = await this.hashingService.compare(body.code, invitation.codeHash)
    if (!validCode) {
      await this.rentersRepository.recordInvitationFailure(invitation.id, envConfig.OTP_MAX_ATTEMPTS)
      throw new BadRequestException('Mã xác nhận lời mời không đúng')
    }

    const passwordHash = await this.hashingService.hash(body.password)
    return this.rentersRepository.acceptInvitation(invitation.id, email, passwordHash)
  }

  async updateForLandlord(userId: number, renterId: number, body: TUpdateRenterForLandlordBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    if (!(await this.rentersRepository.findTenantRenter(tenant.tenantId, renterId))) {
      throw new NotFoundException('Không tìm thấy người thuê trong tenant này')
    }

    return this.rentersRepository.updateTenantRenter(
      tenant.tenantId,
      renterId,
      {
        fullName: body.fullName,
        phone: body.phone,
      },
      {
        dateOfBirth: body.dateOfBirth,
        gender: body.gender,
        identityNumber: body.identityNumber,
        identityFrontUrl: body.identityFrontUrl,
        identityBackUrl: body.identityBackUrl,
        permanentAddress: body.permanentAddress,
        occupation: body.occupation,
        emergencyContactName: body.emergencyContactName,
        emergencyContactPhone: body.emergencyContactPhone,
      },
    )
  }

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
      emergencyContactName: body.emergencyContactName === undefined ? undefined : (body.emergencyContactName ?? null),
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

  async listMyHistory(userId: number, query: TListRentalHistoryQuerySchema) {
    const { page, limit, skip } = normalizePagination(query)
    const [data, total] = await this.rentersRepository.findHistory(
      { renterId: userId, ...(query.status ? { status: query.status } : {}) },
      skip,
      limit,
    )
    return buildPaginatedResult(data, total, page, limit)
  }

  async listHistory(userId: number, renterId: number, query: TListRentalHistoryQuerySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    if (!(await this.rentersRepository.findTenantRenter(tenant.tenantId, renterId)))
      throw new NotFoundException('Không tìm thấy người thuê trong tenant này')
    const { page, limit, skip } = normalizePagination(query)
    const [data, total] = await this.rentersRepository.findHistory(
      { tenantId: tenant.tenantId, renterId, ...(query.status ? { status: query.status } : {}) },
      skip,
      limit,
    )
    return buildPaginatedResult(data, total, page, limit)
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
          OR: [
            { rentalRequests: { some: { tenantId } } },
            { viewingAppointments: { some: { tenantId } } },
            { contracts: { some: { tenantId, deletedAt: null } } },
            { contractMembers: { some: { contract: { tenantId, deletedAt: null } } } },
            { rentalHistories: { some: { tenantId } } },
            { acceptedRenterInvitations: { some: { tenantId, acceptedAt: { not: null }, revokedAt: null } } },
          ],
        },
        ...searchFilter,
      ],
    }
  }
}
