import { Injectable } from '@nestjs/common'
import roleName from '@src/common/constants/role.constant'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import type { Prisma } from 'generated/prisma/client'

type CreateLandlordTenantInput = {
  fullName: string
  email: string
  phone?: string
  passwordHash: string
  tenantName: string
  slug: string
  taxCode?: string
  tenantPhone?: string
  tenantEmail?: string
  address?: string
  planId: number
  billingCycle: 'MONTHLY' | 'YEARLY'
  autoRenew: boolean
  startedAt: Date
  expiredAt: Date
  actorId: number
}

type AssignPlanInput = {
  tenantId: number
  planId: number
  billingCycle: 'MONTHLY' | 'YEARLY'
  autoRenew: boolean
  startedAt: Date
  expiredAt: Date
  actorId: number
}

const subscriptionSelect = {
  id: true,
  tenantId: true,
  planId: true,
  status: true,
  startedAt: true,
  expiredAt: true,
  billingCycle: true,
  autoRenew: true,
  createdAt: true,
  updatedAt: true,
  plan: {
    select: {
      id: true,
      code: true,
      name: true,
      priceMonthly: true,
      priceYearly: true,
      maxRooms: true,
      maxStaff: true,
      allowAiOcr: true,
      allowWebhookPayment: true,
      isActive: true,
    },
  },
} satisfies Prisma.SubscriptionSelect

export const tenantSelect = {
  id: true,
  ownerUserId: true,
  name: true,
  slug: true,
  taxCode: true,
  phone: true,
  email: true,
  address: true,
  verificationStatus: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  owner: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      status: true,
      createdAt: true,
    },
  },
  subscriptions: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: subscriptionSelect,
  },
  createdById: true,
  updatedById: true,
} satisfies Prisma.TenantSelect

/**
 * Repository for Super Admin tenant and landlord persistence operations.
 */
@Injectable()
export class TenantsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findManyAndCount(where: Prisma.TenantWhereInput, skip: number, take: number) {
    return this.prismaService.$transaction([
      this.prismaService.tenant.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }],
        select: tenantSelect,
      }),
      this.prismaService.tenant.count({ where }),
    ])
  }

  async findById(id: number) {
    return this.prismaService.tenant.findFirst({
      where: { id, deletedAt: null },
      select: tenantSelect,
    })
  }

  async findUserByEmail(email: string) {
    return this.prismaService.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true },
    })
  }

  async findUserByPhone(phone: string) {
    return this.prismaService.user.findFirst({
      where: { phone, deletedAt: null },
      select: { id: true },
    })
  }

  async findActivePlan(planId: number) {
    return this.prismaService.plan.findFirst({
      where: { id: planId, isActive: true },
      select: { id: true },
    })
  }

  async isSlugTaken(slug: string) {
    const tenant = await this.prismaService.tenant.findUnique({
      where: { slug },
      select: { id: true },
    })
    return Boolean(tenant)
  }

  /**
   * Creates a landlord account, tenant membership, and active subscription atomically.
   */
  async createLandlordTenant(input: CreateLandlordTenantInput) {
    return this.prismaService.$transaction(async (tx) => {
      await tx.role.findUniqueOrThrow({ where: { id: roleName.LANDLORD }, select: { id: true } })
      await tx.plan.findFirstOrThrow({ where: { id: input.planId, isActive: true }, select: { id: true } })

      const user = await tx.user.create({
        data: {
          email: input.email,
          phone: input.phone ?? null,
          fullName: input.fullName,
          passwordHash: input.passwordHash,
        },
        select: { id: true },
      })

      const tenant = await tx.tenant.create({
        data: {
          ownerUserId: user.id,
          name: input.tenantName,
          slug: input.slug,
          taxCode: input.taxCode ?? null,
          phone: input.tenantPhone ?? input.phone ?? null,
          email: input.tenantEmail ?? input.email,
          address: input.address ?? null,
          createdById: input.actorId,
        },
        select: { id: true },
      })

      await tx.tenantMember.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          roleId: roleName.LANDLORD,
          status: 'ACTIVE',
          joinedAt: input.startedAt,
        },
      })

      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: input.planId,
          status: 'ACTIVE',
          startedAt: input.startedAt,
          expiredAt: input.expiredAt,
          billingCycle: input.billingCycle,
          autoRenew: input.autoRenew,
        },
      })

      return tx.tenant.findUniqueOrThrow({
        where: { id: tenant.id },
        select: tenantSelect,
      })
    })
  }

  async update(id: number, data: Prisma.TenantUpdateInput) {
    return this.prismaService.tenant.update({
      where: { id },
      data,
      select: tenantSelect,
    })
  }

  /**
   * Cancels current active subscriptions and creates the new active plan assignment atomically.
   */
  async assignPlan(input: AssignPlanInput) {
    return this.prismaService.$transaction(async (tx) => {
      await tx.tenant.findFirstOrThrow({ where: { id: input.tenantId, deletedAt: null }, select: { id: true } })
      await tx.plan.findFirstOrThrow({ where: { id: input.planId, isActive: true }, select: { id: true } })

      await tx.subscription.updateMany({
        where: {
          tenantId: input.tenantId,
          status: 'ACTIVE',
        },
        data: {
          status: 'CANCELED',
          autoRenew: false,
        },
      })

      await tx.subscription.create({
        data: {
          tenantId: input.tenantId,
          planId: input.planId,
          status: 'ACTIVE',
          startedAt: input.startedAt,
          expiredAt: input.expiredAt,
          billingCycle: input.billingCycle,
          autoRenew: input.autoRenew,
        },
      })

      await tx.tenant.update({
        where: { id: input.tenantId },
        data: { updatedById: input.actorId },
      })

      return tx.tenant.findUniqueOrThrow({
        where: { id: input.tenantId },
        select: tenantSelect,
      })
    })
  }
}
