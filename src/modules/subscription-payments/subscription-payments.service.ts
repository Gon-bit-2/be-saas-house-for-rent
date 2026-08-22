import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import envConfig from '@src/config/env.config'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import { TenantAccessService } from '@src/shared/modules/services/tenant-access.service'
import type { Prisma, SubscriptionPaymentPurpose, SubscriptionPaymentStatus } from 'generated/prisma/client'
import type {
  TCreateSubscriptionCheckoutBodySchema,
  TListMySubscriptionPaymentsQuerySchema,
  TListSubscriptionPaymentsQuerySchema,
} from './model/subscription-payments.model'
import { PayosService } from '../payos/payos.service'
import {
  SubscriptionPaymentsRepository,
  type SubscriptionPaymentRecord,
} from './repositories/subscription-payments.repo'
import { addBillingCycle } from './subscription-period.util'

@Injectable()
export class SubscriptionPaymentsService {
  constructor(
    private readonly repository: SubscriptionPaymentsRepository,
    private readonly tenantAccessService: TenantAccessService,
    private readonly payosService: PayosService,
  ) {}

  async getMine(userId: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const [subscription, openPayment, usageLimits] = await Promise.all([
      this.repository.findCurrent(tenant.tenantId),
      this.repository.findOpen(tenant.tenantId),
      this.repository.getUsageLimits(tenant.tenantId),
    ])
    const isExpired = openPayment?.expiredAt && openPayment.expiredAt <= new Date()
    if (openPayment && isExpired) await this.repository.expire(openPayment.id, tenant.tenantId)
    return { subscription, pendingPayment: isExpired ? null : openPayment, usageLimits }
  }

  async listMine(userId: number, query: TListMySubscriptionPaymentsQuerySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const { page, limit, skip } = normalizePagination(query)
    const where = this.buildWhere({ ...query, tenantId: tenant.tenantId })
    const [payments, total] = await this.repository.findManyAndCount(where, skip, limit)
    return buildPaginatedResult(payments, total, page, limit)
  }

  async getMineById(userId: number, id: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const payment = await this.repository.findById(id, tenant.tenantId)
    if (!payment) throw new NotFoundException('Không tìm thấy thanh toán gói trong tenant hiện tại')
    return payment
  }

  async list(query: TListSubscriptionPaymentsQuerySchema) {
    const { page, limit, skip } = normalizePagination(query)
    const where = this.buildWhere(query)
    const [payments, total] = await this.repository.findManyAndCount(where, skip, limit)
    return buildPaginatedResult(payments, total, page, limit)
  }

  async getById(id: number) {
    const payment = await this.repository.findById(id)
    if (!payment) throw new NotFoundException('Không tìm thấy thanh toán gói')
    return payment
  }

  async createCheckout(userId: number, body: TCreateSubscriptionCheckoutBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const now = new Date()
    const reusable = await this.resolveOpenPayment(tenant.tenantId, body.planId, body.billingCycle, now)
    if (reusable) return reusable

    const plan = await this.repository.findPlan(body.planId)
    if (!plan) throw new NotFoundException('Không tìm thấy gói dịch vụ đang mở bán')
    const amount = Number(body.billingCycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly)
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new BadRequestException('Giá gói PayOS phải là số nguyên VND lớn hơn 0')
    }

    const current = await this.repository.findCurrent(tenant.tenantId)
    const purpose =
      current?.planId === plan.id && current.billingCycle === body.billingCycle ? 'RENEWAL' : 'PLAN_CHANGE'
    const paymentExpiredAt = new Date(now.getTime() + envConfig.PAYOS_SUBSCRIPTION_EXPIRE_MINUTES * 60_000)

    let draft: SubscriptionPaymentRecord
    try {
      draft = await this.repository.create({
        tenantId: tenant.tenantId,
        currentSubscriptionId: purpose === 'RENEWAL' ? current?.id : undefined,
        planId: plan.id,
        billingCycle: body.billingCycle,
        purpose,
        amount,
        paymentExpiredAt,
        subscriptionStartedAt: now,
        subscriptionExpiredAt: addBillingCycle(now, body.billingCycle),
        actorId: userId,
      })
    } catch (error) {
      if (this.isPrismaError(error, 'P2002')) {
        const concurrent = await this.repository.findOpen(tenant.tenantId)
        if (concurrent && this.matchesRequest(concurrent, body.planId, body.billingCycle)) return concurrent
        throw new ConflictException('Tenant đang có một checkout PayOS khác chưa hoàn tất')
      }
      throw error
    }

    if (!draft.orderCode) {
      await this.repository.fail(draft.id, tenant.tenantId, 'ORDER_CODE_MISSING')
      throw new ConflictException('Không thể sinh mã đơn hàng PayOS')
    }

    try {
      const paymentLink = await this.payosService.createPaymentLink({
        orderCode: draft.orderCode,
        amount,
        description: ('SUB' + draft.id).slice(0, 25),
        returnUrl: envConfig.PAYOS_SUBSCRIPTION_RETURN_URL,
        cancelUrl: envConfig.PAYOS_SUBSCRIPTION_CANCEL_URL,
        expiredAt: Math.floor(paymentExpiredAt.getTime() / 1000),
        items: [{ name: plan.name, quantity: 1, price: amount }],
      })

      return this.repository.update(draft.id, {
        paymentLinkId: paymentLink.paymentLinkId,
        checkoutUrl: paymentLink.checkoutUrl,
        qrContent: paymentLink.qrCode,
        providerStatus: paymentLink.status,
        updatedById: userId,
      })
    } catch (error) {
      await this.repository.fail(draft.id, tenant.tenantId, 'CREATE_FAILED')
      throw error
    }
  }

  async cancel(userId: number, id: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const payment = await this.getMineById(userId, id)
    if (payment.status !== 'PENDING') throw new ConflictException('Checkout PayOS không còn ở trạng thái chờ')
    if (!payment.orderCode) throw new ConflictException('Checkout PayOS không có mã đơn hàng')
    if (!payment.paymentLinkId) throw new ConflictException('Checkout PayOS chưa có payment link')

    const providerPayment = await this.payosService.getPaymentLink(payment.paymentLinkId)
    const providerStatus = providerPayment.status.toUpperCase()
    if (providerStatus === 'PAID') {
      throw new ConflictException('PayOS đã ghi nhận thanh toán, vui lòng chờ webhook xử lý')
    }
    if (providerStatus !== 'CANCELLED' && providerStatus !== 'CANCELED') {
      await this.payosService.cancelPaymentLink(payment.paymentLinkId, 'Landlord canceled checkout')
    }
    return this.repository.cancel(payment.id, tenant.tenantId, userId, 'CANCELLED')
  }

  async hasOpen(tenantId: number) {
    return this.repository.hasOpen(tenantId)
  }

  async handlePayosWebhook(data: {
    orderCode: number
    paymentLinkId: string
    reference: string
    amount: number
    currency: string
    transactionDateTime: Date
  }) {
    const payment = await this.repository.findByPayosIdentifiers(data.orderCode, data.paymentLinkId)
    if (!payment) return { matched: false as const }
    if (Number(payment.amount) !== data.amount || data.currency.toUpperCase() !== 'VND') {
      return {
        matched: true as const,
        status: 'FAILED' as const,
        payment,
        errorMessage: 'Số tiền hoặc đơn vị tiền tệ PayOS không khớp checkout subscription',
      }
    }
    if (payment.status === 'PAID' && payment.transactionCode && payment.transactionCode !== data.reference) {
      return {
        matched: true as const,
        status: 'FAILED' as const,
        payment,
        errorMessage: 'Checkout subscription đã được thanh toán bằng mã tham chiếu khác',
      }
    }

    const result = await this.repository.complete({
      orderCode: data.orderCode,
      paymentLinkId: data.paymentLinkId,
      transactionCode: data.reference,
      paidAt: data.transactionDateTime,
    })
    return {
      matched: true as const,
      status: result.outcome === 'PROCESSED' ? ('PROCESSED' as const) : ('IGNORED' as const),
      payment: result.payment ?? payment,
      errorMessage: result.outcome === 'INVALID_STATE' ? 'Checkout subscription không còn ở trạng thái chờ' : null,
    }
  }

  private async resolveOpenPayment(tenantId: number, planId: number, billingCycle: 'MONTHLY' | 'YEARLY', now: Date) {
    const open = await this.repository.findOpen(tenantId)
    if (!open) return null
    if (open.expiredAt && open.expiredAt <= now) {
      await this.repository.expire(open.id, tenantId)
      return null
    }
    if (this.matchesRequest(open, planId, billingCycle)) return open
    throw new ConflictException('Tenant đang có một checkout PayOS khác chưa hoàn tất')
  }

  private matchesRequest(
    payment: { subscription: { planId: number; billingCycle: string } },
    planId: number,
    billingCycle: string,
  ) {
    return payment.subscription.planId === planId && payment.subscription.billingCycle === billingCycle
  }

  private buildWhere(query: {
    tenantId?: number
    subscriptionId?: number
    planId?: number
    status?: SubscriptionPaymentStatus
    purpose?: SubscriptionPaymentPurpose
    from?: Date
    to?: Date
    search?: string
  }): Prisma.SubscriptionPaymentWhereInput {
    return {
      ...(query.tenantId ? { tenantId: query.tenantId } : {}),
      ...(query.subscriptionId ? { subscriptionId: query.subscriptionId } : {}),
      ...(query.planId ? { subscription: { planId: query.planId } } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.purpose ? { purpose: query.purpose } : {}),
      ...(query.from || query.to
        ? { createdAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { transactionCode: { contains: query.search, mode: 'insensitive' } },
              { paymentLinkId: { contains: query.search, mode: 'insensitive' } },
              { tenant: { name: { contains: query.search, mode: 'insensitive' } } },
              { subscription: { plan: { name: { contains: query.search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    }
  }

  private isPrismaError(error: unknown, code: string) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === code
  }
}
