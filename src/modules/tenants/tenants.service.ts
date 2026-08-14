import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import { HashingService } from '@src/shared/modules/services/hashing.service'
import type { Prisma } from 'generated/prisma/client'
import type {
  TAssignTenantPlanBodySchema,
  TCreateTenantBodySchema,
  TListTenantsQuerySchema,
  TUpdateTenantBodySchema,
  TUpdateTenantStatusBodySchema,
  TUpdateTenantVerificationBodySchema,
  TRegisterTenantBodySchema,
} from './model/tenants.model'
import { SubscriptionPaymentsService } from '../subscription-payments/subscription-payments.service'
import { TenantsRepository } from './repositories/tenants.repo'

/**
 * Service containing Super Admin business rules for landlord tenants.
 */
@Injectable()
export class TenantsService {
  constructor(
    private readonly tenantsRepository: TenantsRepository,
    private readonly hashingService: HashingService,
    private readonly subscriptionPaymentsService: SubscriptionPaymentsService,
  ) {}

  async list(query: TListTenantsQuerySchema) {
    const { page, limit, skip } = normalizePagination(query)
    const where = this.buildListWhere(query)
    const [tenants, total] = await this.tenantsRepository.findManyAndCount(where, skip, limit)
    return buildPaginatedResult(tenants, total, page, limit)
  }

  async getById(id: number) {
    const tenant = await this.tenantsRepository.findById(id)
    if (!tenant) {
      throw new NotFoundException('Không tìm thấy tenant')
    }
    return tenant
  }

  /**
   * Creates a landlord account with its tenant and first active subscription in one transaction.
   */
  async createLandlordTenant(body: TCreateTenantBodySchema, actorId: number) {
    await this.assertUniqueUserIdentity(body.email, body.phone)
    await this.assertActivePlan(body.planId)

    const passwordHash = await this.hashingService.hash(body.password)
    const slug = await this.generateUniqueSlug(body.tenantName)
    const { startedAt, expiredAt } = this.calculateSubscriptionPeriod(body.billingCycle)

    return this.tenantsRepository.createLandlordTenant({
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      passwordHash,
      tenantName: body.tenantName,
      slug,
      taxCode: body.taxCode,
      tenantPhone: body.tenantPhone,
      tenantEmail: body.tenantEmail,
      address: body.address,
      planId: body.planId,
      billingCycle: body.billingCycle,
      autoRenew: body.autoRenew,
      startedAt,
      expiredAt,
      actorId,
    })
  }

  /**
   * Registers a new landlord tenant for an existing user.
   */
  async registerMyTenant(actorId: number, body: TRegisterTenantBodySchema) {
    const defaultPlan = await this.tenantsRepository.findFirstActivePlan()
    if (!defaultPlan) {
      throw new NotFoundException('Không tìm thấy gói dịch vụ nào đang hoạt động để đăng ký')
    }
    const planId = defaultPlan.id

    const slug = await this.generateUniqueSlug(body.tenantName)
    const { startedAt, expiredAt } = this.calculateSubscriptionPeriod('MONTHLY')

    return this.tenantsRepository.registerTenant({
      userId: actorId,
      tenantName: body.tenantName,
      slug,
      taxCode: body.taxCode,
      tenantPhone: body.tenantPhone,
      tenantEmail: body.tenantEmail,
      address: body.address,
      planId: planId,
      billingCycle: 'MONTHLY',
      autoRenew: true,
      startedAt,
      expiredAt,
    })
  }

  async update(id: number, body: TUpdateTenantBodySchema, actorId: number) {
    await this.getById(id)
    return this.tenantsRepository.update(id, {
      ...body,
      updatedBy: { connect: { id: actorId } },
    })
  }

  async updateStatus(id: number, body: TUpdateTenantStatusBodySchema, actorId: number) {
    await this.getById(id)
    return this.tenantsRepository.update(id, {
      status: body.status,
      updatedBy: { connect: { id: actorId } },
    })
  }

  async updateVerification(id: number, body: TUpdateTenantVerificationBodySchema, actorId: number) {
    await this.getById(id)
    return this.tenantsRepository.update(id, {
      verificationStatus: body.verificationStatus,
      updatedBy: { connect: { id: actorId } },
    })
  }

  async assignPlan(id: number, body: TAssignTenantPlanBodySchema, actorId: number) {
    await this.getById(id)
    await this.assertActivePlan(body.planId)
    if (await this.subscriptionPaymentsService.hasOpen(id)) {
      throw new ConflictException('Tenant đang có checkout PayOS chưa hoàn tất')
    }
    const { startedAt, expiredAt } = this.calculateSubscriptionPeriod(body.billingCycle)

    return this.tenantsRepository.assignPlan({
      tenantId: id,
      planId: body.planId,
      billingCycle: body.billingCycle,
      autoRenew: body.autoRenew,
      startedAt,
      expiredAt,
      actorId,
    })
  }

  private buildListWhere(query: TListTenantsQuerySchema): Prisma.TenantWhereInput {
    return {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.verificationStatus ? { verificationStatus: query.verificationStatus } : {}),
      ...(query.planId
        ? {
            subscriptions: {
              some: {
                planId: query.planId,
                status: 'ACTIVE',
              },
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
              { owner: { fullName: { contains: query.search, mode: 'insensitive' } } },
              { owner: { email: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }
  }

  private async assertUniqueUserIdentity(email: string, phone?: string) {
    const existingEmail = await this.tenantsRepository.findUserByEmail(email)
    if (existingEmail) {
      throw new ConflictException('Email đã được sử dụng')
    }

    if (phone) {
      const existingPhone = await this.tenantsRepository.findUserByPhone(phone)
      if (existingPhone) {
        throw new ConflictException('Số điện thoại đã được sử dụng')
      }
    }
  }

  private async assertActivePlan(planId: number) {
    const plan = await this.tenantsRepository.findActivePlan(planId)
    if (!plan) {
      throw new NotFoundException('Không tìm thấy gói dịch vụ đang hoạt động')
    }
  }

  private async generateUniqueSlug(name: string) {
    const baseSlug = this.slugify(name) || 'tenant'
    let candidate = baseSlug
    let suffix = 2

    while (await this.tenantsRepository.isSlugTaken(candidate)) {
      candidate = `${baseSlug}-${suffix}`
      suffix += 1
    }

    return candidate
  }

  private slugify(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 255)
  }

  private calculateSubscriptionPeriod(billingCycle: 'MONTHLY' | 'YEARLY') {
    const startedAt = new Date()
    const expiredAt = new Date(startedAt)

    if (billingCycle === 'YEARLY') {
      expiredAt.setFullYear(expiredAt.getFullYear() + 1)
    } else {
      expiredAt.setMonth(expiredAt.getMonth() + 1)
    }

    return { startedAt, expiredAt }
  }
}
