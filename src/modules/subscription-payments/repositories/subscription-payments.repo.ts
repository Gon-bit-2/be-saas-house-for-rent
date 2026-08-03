import { Injectable } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import type { BillingCycle, Prisma, SubscriptionPaymentPurpose } from 'generated/prisma/client'
import { addBillingCycle } from '../subscription-period.util'

export const subscriptionPaymentSelect = {
  id: true,
  subscriptionId: true,
  tenantId: true,
  purpose: true,
  amount: true,
  paymentMethod: true,
  provider: true,
  orderCode: true,
  paymentLinkId: true,
  checkoutUrl: true,
  qrContent: true,
  providerStatus: true,
  transactionCode: true,
  status: true,
  paidAt: true,
  expiredAt: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  updatedById: true,
  tenant: { select: { id: true, name: true, slug: true } },
  subscription: {
    select: {
      id: true,
      tenantId: true,
      planId: true,
      status: true,
      billingCycle: true,
      startedAt: true,
      expiredAt: true,
      autoRenew: true,
      plan: { select: { id: true, code: true, name: true } },
    },
  },
} satisfies Prisma.SubscriptionPaymentSelect

export type SubscriptionPaymentRecord = Prisma.SubscriptionPaymentGetPayload<{
  select: typeof subscriptionPaymentSelect
}>

const currentSubscriptionSelect = {
  id: true,
  tenantId: true,
  planId: true,
  status: true,
  billingCycle: true,
  startedAt: true,
  expiredAt: true,
  autoRenew: true,
  plan: { select: { id: true, code: true, name: true, priceMonthly: true, priceYearly: true } },
} satisfies Prisma.SubscriptionSelect

type CreateInput = {
  tenantId: number
  currentSubscriptionId?: number
  planId: number
  billingCycle: BillingCycle
  purpose: SubscriptionPaymentPurpose
  amount: number
  paymentExpiredAt: Date
  subscriptionStartedAt: Date
  subscriptionExpiredAt: Date
  actorId: number
}

@Injectable()
export class SubscriptionPaymentsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findManyAndCount(where: Prisma.SubscriptionPaymentWhereInput, skip: number, take: number) {
    return this.prismaService.$transaction([
      this.prismaService.subscriptionPayment.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: subscriptionPaymentSelect,
      }),
      this.prismaService.subscriptionPayment.count({ where }),
    ])
  }

  async findById(id: number, tenantId?: number) {
    return this.prismaService.subscriptionPayment.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
      select: subscriptionPaymentSelect,
    })
  }

  async findOpen(tenantId: number) {
    return this.prismaService.subscriptionPayment.findFirst({
      where: { tenantId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      select: subscriptionPaymentSelect,
    })
  }

  async findCurrent(tenantId: number) {
    for (const status of ['ACTIVE', 'PAST_DUE', 'EXPIRED'] as const) {
      const subscription = await this.prismaService.subscription.findFirst({
        where: { tenantId, status },
        orderBy: { id: 'desc' },
        select: currentSubscriptionSelect,
      })
      if (subscription) return subscription
    }
    return null
  }

  async findPlan(id: number) {
    return this.prismaService.plan.findFirst({
      where: { id, isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        priceMonthly: true,
        priceYearly: true,
        isActive: true,
      },
    })
  }

  async create(input: CreateInput): Promise<SubscriptionPaymentRecord> {
    return this.prismaService.$transaction(async (tx) => {
      const subscription =
        input.purpose === 'PLAN_CHANGE'
          ? await tx.subscription.create({
              data: {
                tenantId: input.tenantId,
                planId: input.planId,
                status: 'PENDING',
                startedAt: input.subscriptionStartedAt,
                expiredAt: input.subscriptionExpiredAt,
                billingCycle: input.billingCycle,
                autoRenew: false,
              },
              select: { id: true },
            })
          : await tx.subscription.findFirstOrThrow({
              where: { id: input.currentSubscriptionId, tenantId: input.tenantId },
              select: { id: true },
            })

      return tx.subscriptionPayment.create({
        data: {
          subscriptionId: subscription.id,
          tenantId: input.tenantId,
          purpose: input.purpose,
          amount: input.amount,
          paymentMethod: 'QR',
          provider: 'PayOS',
          status: 'PENDING',
          expiredAt: input.paymentExpiredAt,
          createdById: input.actorId,
          updatedById: input.actorId,
        },
        select: subscriptionPaymentSelect,
      })
    })
  }

  async update(id: number, data: Prisma.SubscriptionPaymentUncheckedUpdateInput) {
    return this.prismaService.subscriptionPayment.update({
      where: { id },
      data,
      select: subscriptionPaymentSelect,
    })
  }

  async cancel(id: number, tenantId: number, actorId: number, providerStatus: string) {
    return this.finishPending(id, tenantId, 'CANCELED', providerStatus, actorId)
  }

  async expire(id: number, tenantId: number) {
    return this.finishPending(id, tenantId, 'EXPIRED', 'EXPIRED', null)
  }

  async fail(id: number, tenantId: number, providerStatus: string) {
    return this.finishPending(id, tenantId, 'FAILED', providerStatus, null)
  }

  async hasOpen(tenantId: number) {
    return (await this.prismaService.subscriptionPayment.count({ where: { tenantId, status: 'PENDING' } })) > 0
  }

  async findByPayosIdentifiers(orderCode: number, paymentLinkId: string) {
    return this.prismaService.subscriptionPayment.findFirst({
      where: { provider: 'PayOS', orderCode, paymentLinkId },
      select: subscriptionPaymentSelect,
    })
  }

  async complete(input: { orderCode: number; paymentLinkId: string; transactionCode: string; paidAt: Date }) {
    return this.prismaService.$transaction(
      async (tx) => {
        const payment = await tx.subscriptionPayment.findFirst({
          where: { provider: 'PayOS', orderCode: input.orderCode, paymentLinkId: input.paymentLinkId },
          select: subscriptionPaymentSelect,
        })
        if (!payment) return { outcome: 'NOT_FOUND' as const, payment: null }
        if (payment.status === 'PAID') return { outcome: 'DUPLICATE' as const, payment }
        if (payment.status !== 'PENDING') return { outcome: 'INVALID_STATE' as const, payment }

        const claimed = await tx.subscriptionPayment.updateMany({
          where: { id: payment.id, status: 'PENDING' },
          data: {
            status: 'PAID',
            transactionCode: input.transactionCode,
            paidAt: input.paidAt,
            providerStatus: 'PAID',
            updatedById: null,
          },
        })
        if (claimed.count !== 1) return { outcome: 'DUPLICATE' as const, payment }

        if (payment.purpose === 'RENEWAL') {
          const baseDate = payment.subscription.expiredAt > input.paidAt ? payment.subscription.expiredAt : input.paidAt
          await tx.subscription.update({
            where: { id: payment.subscriptionId },
            data: {
              status: 'ACTIVE',
              expiredAt: addBillingCycle(baseDate, payment.subscription.billingCycle),
            },
          })
        } else {
          await tx.subscription.updateMany({
            where: { tenantId: payment.tenantId, status: 'ACTIVE', id: { not: payment.subscriptionId } },
            data: { status: 'CANCELED', autoRenew: false },
          })
          const activated = await tx.subscription.updateMany({
            where: { id: payment.subscriptionId, tenantId: payment.tenantId, status: 'PENDING' },
            data: {
              status: 'ACTIVE',
              startedAt: input.paidAt,
              expiredAt: addBillingCycle(input.paidAt, payment.subscription.billingCycle),
            },
          })
          if (activated.count !== 1) throw new Error('SUBSCRIPTION_ACTIVATION_CONFLICT')
        }

        const updated = await tx.subscriptionPayment.findUniqueOrThrow({
          where: { id: payment.id },
          select: subscriptionPaymentSelect,
        })
        return { outcome: 'PROCESSED' as const, payment: updated }
      },
      { isolationLevel: 'Serializable' },
    )
  }

  private async finishPending(
    id: number,
    tenantId: number,
    status: 'FAILED' | 'CANCELED' | 'EXPIRED',
    providerStatus: string,
    actorId: number | null,
  ) {
    return this.prismaService.$transaction(async (tx) => {
      const payment = await tx.subscriptionPayment.findFirstOrThrow({
        where: { id, tenantId },
        select: { id: true, subscriptionId: true, purpose: true, status: true },
      })
      if (payment.status !== 'PENDING') {
        return tx.subscriptionPayment.findUniqueOrThrow({ where: { id }, select: subscriptionPaymentSelect })
      }

      await tx.subscriptionPayment.update({
        where: { id },
        data: { status, providerStatus, updatedById: actorId },
      })
      if (payment.purpose === 'PLAN_CHANGE') {
        await tx.subscription.updateMany({
          where: { id: payment.subscriptionId, tenantId, status: 'PENDING' },
          data: { status: 'CANCELED', autoRenew: false },
        })
      }
      return tx.subscriptionPayment.findUniqueOrThrow({ where: { id }, select: subscriptionPaymentSelect })
    })
  }
}
