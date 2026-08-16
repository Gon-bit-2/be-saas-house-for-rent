import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import envConfig from '@src/config/env.config'
import { NotificationEventsService } from '@src/modules/notifications/notification-events.service'
import { TenantAccessService } from '@src/shared/modules/services/tenant-access.service'
import type { InvoiceStatus, Prisma } from 'generated/prisma/client'
import { PayosService } from '../payos/payos.service'
import { SubscriptionPaymentsService } from '../subscription-payments/subscription-payments.service'
import type {
  TListPaymentsQuerySchema,
  TPayosWebhookBodySchema,
  TPayosWebhookDataSchema,
  TReviewPaymentBodySchema,
  TSubmitPaymentConfirmationBodySchema,
} from './model/payments.model'
import { PaymentsRepository, type PayableInvoice } from './repositories/payments.repo'
import { digestWebhookPayload, sanitizePayosWebhookPayload, sanitizeWebhookText } from './webhook-log.security'

const PAYABLE_INVOICE_STATUSES: InvoiceStatus[] = ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE']

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name)
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly tenantAccessService: TenantAccessService,
    private readonly payosService: PayosService,
    private readonly notificationEventsService: NotificationEventsService,
    private readonly subscriptionPaymentsService: SubscriptionPaymentsService,
  ) {}

  async listMine(userId: number, query: TListPaymentsQuerySchema) {
    const { page, limit, skip } = normalizePagination(query)
    const where = this.buildPaymentWhereForRenter(userId, query)
    const [payments, total] = await this.paymentsRepository.findPaymentsAndCount(where, skip, limit)
    return buildPaginatedResult(payments, total, page, limit)
  }

  async getMine(userId: number, id: number) {
    const payment = await this.paymentsRepository.findMyPayment(userId, id)
    if (!payment) {
      throw new NotFoundException('Không tìm thấy thanh toán của bạn')
    }
    return payment
  }

  async listForLandlord(userId: number, query: TListPaymentsQuerySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const { page, limit, skip } = normalizePagination(query)
    const where = this.buildPaymentWhere(tenant.tenantId, query)
    const [payments, total] = await this.paymentsRepository.findPaymentsAndCount(where, skip, limit)
    return buildPaginatedResult(payments, total, page, limit)
  }

  async getForLandlord(userId: number, id: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const payment = await this.paymentsRepository.findTenantPayment(tenant.tenantId, id)
    if (!payment) {
      throw new NotFoundException('Không tìm thấy thanh toán trong tenant hiện tại')
    }
    return payment
  }

  async getMyPaymentQr(userId: number, invoiceId: number) {
    const invoice = await this.getMyPayableInvoiceOrThrow(userId, invoiceId)
    const amount = this.toMoneyNumber(invoice.debtAmount)
    const qr = await this.paymentsRepository.findActiveQr(invoice.id, amount, new Date())
    if (!qr) {
      throw new NotFoundException('Hóa đơn chưa có mã QR PayOS còn hiệu lực')
    }
    return qr
  }

  async createMyPaymentQr(userId: number, invoiceId: number) {
    const invoice = await this.getMyPayableInvoiceOrThrow(userId, invoiceId)
    const amount = this.toMoneyNumber(invoice.debtAmount)
    this.assertPositiveDebt(amount)

    const existingQr = await this.paymentsRepository.findActiveQr(invoice.id, amount, new Date())
    if (existingQr) {
      return existingQr
    }

    const expiredAt = new Date(Date.now() + envConfig.PAYOS_QR_EXPIRE_MINUTES * 60_000)
    const qrDraft = await this.paymentsRepository.createQrDraft({
      tenantId: invoice.tenantId,
      invoiceId: invoice.id,
      amount,
      expiredAt,
    })
    if (!qrDraft.orderCode) {
      throw new ConflictException('Không thể sinh mã đơn hàng PayOS')
    }

    try {
      const paymentLink = await this.payosService.createPaymentLink({
        orderCode: qrDraft.orderCode,
        amount: Math.round(amount),
        description: this.buildPayosDescription(invoice),
        returnUrl: envConfig.PAYOS_RETURN_URL,
        cancelUrl: envConfig.PAYOS_CANCEL_URL,
        expiredAt: Math.floor(expiredAt.getTime() / 1000),
        buyerName: invoice.renter.fullName,
        buyerEmail: invoice.renter.email,
        buyerPhone: invoice.renter.phone ?? undefined,
        items: [{ name: invoice.invoiceCode, quantity: 1, price: Math.round(amount) }],
      })

      return this.paymentsRepository.updateQrWithPayos(qrDraft.id, {
        paymentLinkId: paymentLink.paymentLinkId,
        checkoutUrl: paymentLink.checkoutUrl,
        qrContent: paymentLink.qrCode,
        providerStatus: paymentLink.status,
      })
    } catch (error) {
      await this.paymentsRepository.markQrCanceled(qrDraft.id, 'CREATE_FAILED')
      throw error
    }
  }

  async submitMyConfirmation(userId: number, invoiceId: number, body: TSubmitPaymentConfirmationBodySchema) {
    const invoice = await this.getMyPayableInvoiceOrThrow(userId, invoiceId)
    const remainingAmount = this.toMoneyNumber(invoice.debtAmount)
    this.assertPositiveDebt(remainingAmount)
    if (body.amount > remainingAmount) {
      throw new BadRequestException('Số tiền xác nhận không được lớn hơn công nợ còn lại')
    }

    const payment = await this.paymentsRepository.createRenterConfirmation({
      tenantId: invoice.tenantId,
      invoiceId: invoice.id,
      payerId: userId,
      amount: body.amount,
      transactionCode: body.transactionCode,
      evidenceUrl: body.evidenceUrl,
      renterNote: body.renterNote,
      paidAt: body.paidAt,
    })
    await this.notificationEventsService.notifyPaymentPending(payment)
    return payment
  }

  async approve(userId: number, id: number, body: TReviewPaymentBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const updated = await this.paymentsRepository.approvePayment(tenant.tenantId, id, userId, body.landlordNote)
    await this.notificationEventsService.notifyPaymentReviewed(updated)
    return updated
  }

  async reject(userId: number, id: number, body: TReviewPaymentBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const updated = await this.paymentsRepository.rejectPayment(tenant.tenantId, id, userId, body.landlordNote)
    await this.notificationEventsService.notifyPaymentReviewed(updated)
    return updated
  }

  async handlePayosWebhook(payload: TPayosWebhookBodySchema) {
    try {
      const verifiedData = await this.payosService.verifyWebhook(payload)
      const data = verifiedData
      const transactionDateTime = this.parsePayosDateTime(data.transactionDateTime)
      const qr = await this.paymentsRepository.findQrByPayosIdentifiers(data.orderCode, data.paymentLinkId)

      if (!payload.success || payload.code !== '00' || data.code !== '00') {
        await this.logWebhook(payload, data, false, 'IGNORED', null, transactionDateTime)
        return { code: '00', desc: 'success', success: true }
      }

      if (!qr) {
        if (!transactionDateTime) {
          await this.logWebhook(payload, data, true, 'FAILED', 'Thời gian giao dịch PayOS không hợp lệ', null)
          return { code: '00', desc: 'success', success: true }
        }

        const subscriptionResult = await this.subscriptionPaymentsService.handlePayosWebhook({
          orderCode: data.orderCode,
          paymentLinkId: data.paymentLinkId,
          reference: data.reference,
          amount: data.amount,
          currency: data.currency,
          transactionDateTime,
        })
        if (subscriptionResult.matched) {
          await this.logWebhook(
            payload,
            data,
            true,
            subscriptionResult.status,
            subscriptionResult.errorMessage,
            transactionDateTime,
            subscriptionResult.payment.tenantId,
            undefined,
            subscriptionResult.payment.id,
          )
          return { code: '00', desc: 'success', success: true }
        }

        await this.logWebhook(
          payload,
          data,
          true,
          'FAILED',
          'Không tìm thấy mã QR PayOS tương ứng',
          transactionDateTime,
        )
        return { code: '00', desc: 'success', success: true }
      }

      if (this.toMoneyNumber(qr.amount) !== data.amount) {
        await this.logWebhook(
          payload,
          data,
          true,
          'FAILED',
          'Số tiền webhook không khớp mã QR',
          transactionDateTime,
          qr.tenantId,
          qr.invoiceId,
        )
        return { code: '00', desc: 'success', success: true }
      }

      const result = await this.paymentsRepository.createPendingWebhookPayment({
        tenantId: qr.tenantId,
        invoiceId: qr.invoiceId,
        payerId: qr.invoice.renterId,
        qrCodeId: qr.id,
        amount: data.amount,
        transactionCode: data.reference,
        paidAt: transactionDateTime,
      })

      if (!this.matchesWebhookPayment(result.payment, qr, data.amount)) {
        this.logger.warn(
          `security_event=payos_reference_conflict payment_id=${result.payment.id} tenant_id=${qr.tenantId}`,
        )
        await this.logWebhook(
          payload,
          data,
          true,
          'FAILED',
          'Mã tham chiếu PayOS đã tồn tại với dữ liệu khác',
          transactionDateTime,
          qr.tenantId,
          qr.invoiceId,
        )
        return { code: '00', desc: 'success', success: true }
      }
      if (!result.created) {
        this.logger.log(`security_event=payos_duplicate payment_id=${result.payment.id} tenant_id=${qr.tenantId}`)
        await this.logWebhook(
          payload,
          data,
          true,
          'IGNORED',
          'Webhook PayOS đã được xử lý',
          transactionDateTime,
          qr.tenantId,
          qr.invoiceId,
        )
        return { code: '00', desc: 'success', success: true }
      }

      const approvedPayment = await this.paymentsRepository.approvePayment(
        qr.tenantId,
        result.payment.id,
        qr.invoice.renterId, // Dùng renterId như actorId hệ thống để lưu vết
        'Hệ thống tự động xác nhận qua PayOS Webhook',
      )
      await this.notificationEventsService.notifyPaymentReviewed(approvedPayment)
      await this.logWebhook(payload, data, true, 'PROCESSED', null, transactionDateTime, qr.tenantId, qr.invoiceId)
      return { code: '00', desc: 'success', success: true }
    } catch (error) {
      await this.logWebhook(
        payload,
        payload.data,
        false,
        'FAILED',
        error instanceof Error ? error.message : 'Webhook PayOS không hợp lệ',
      )
      throw new BadRequestException('Webhook PayOS không hợp lệ')
    }
  }

  private async getMyPayableInvoiceOrThrow(userId: number, invoiceId: number) {
    const invoice = await this.paymentsRepository.findMyPayableInvoice(userId, invoiceId)
    if (!invoice) {
      throw new NotFoundException('Không tìm thấy hóa đơn của bạn')
    }
    if (!PAYABLE_INVOICE_STATUSES.includes(invoice.status)) {
      throw new BadRequestException('Hóa đơn không ở trạng thái có thể thanh toán')
    }
    return invoice as PayableInvoice
  }

  private assertPositiveDebt(amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Hóa đơn không còn công nợ')
    }
  }

  private buildPaymentWhere(tenantId: number, query: TListPaymentsQuerySchema): Prisma.PaymentWhereInput {
    return {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.method ? { method: query.method } : {}),
      ...(query.invoiceId ? { invoiceId: query.invoiceId } : {}),
      ...(query.renterId ? { payerId: query.renterId } : {}),
      ...(query.from || query.to
        ? { createdAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { transactionCode: { contains: query.search, mode: 'insensitive' } },
              { invoice: { invoiceCode: { contains: query.search, mode: 'insensitive' } } },
              { payer: { fullName: { contains: query.search, mode: 'insensitive' } } },
              { payer: { email: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }
  }

  private buildPaymentWhereForRenter(userId: number, query: TListPaymentsQuerySchema): Prisma.PaymentWhereInput {
    return {
      payerId: userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.method ? { method: query.method } : {}),
      ...(query.invoiceId ? { invoiceId: query.invoiceId } : {}),
      ...(query.from || query.to
        ? { createdAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { transactionCode: { contains: query.search, mode: 'insensitive' } },
              { invoice: { invoiceCode: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }
  }

  private buildPayosDescription(invoice: PayableInvoice) {
    return `INV${invoice.id}`.slice(0, 25)
  }

  private matchesWebhookPayment(
    payment: { tenantId: number; invoiceId: number; qrCodeId: number | null; amount: unknown },
    qr: { tenantId: number; invoiceId: number; id: number },
    amount: number,
  ) {
    return (
      payment.tenantId === qr.tenantId &&
      payment.invoiceId === qr.invoiceId &&
      payment.qrCodeId === qr.id &&
      this.toMoneyNumber(payment.amount) === amount
    )
  }

  private async logWebhook(
    payload: TPayosWebhookBodySchema,
    data: TPayosWebhookDataSchema,
    signatureValid: boolean,
    status: 'RECEIVED' | 'PROCESSED' | 'FAILED' | 'IGNORED',
    errorMessage: string | null,
    transactionDateTime = this.parsePayosDateTime(data.transactionDateTime),
    tenantId?: number,
    invoiceId?: number,
    subscriptionPaymentId?: number,
  ) {
    const sanitizedPayload = sanitizePayosWebhookPayload(payload)
    return this.paymentsRepository.createWebhookLog({
      provider: 'PayOS',
      tenantId,
      invoiceId,
      subscriptionPaymentId,
      orderCode: data.orderCode,
      paymentLinkId: data.paymentLinkId,
      reference: data.reference,
      transactionCode: data.reference,
      amount: data.amount,
      currency: data.currency,
      providerCode: data.code,
      providerDesc: sanitizeWebhookText(data.desc),
      success: payload.success,
      transactionDateTime,
      payload: sanitizedPayload,
      payloadDigest: digestWebhookPayload(payload, envConfig.PAYMENT_WEBHOOK_LOG_HMAC_SECRET),
      digestKeyVersion: envConfig.PAYMENT_WEBHOOK_LOG_DIGEST_VERSION,
      signatureValid,
      status,
      errorMessage: sanitizeWebhookText(errorMessage),
    })
  }

  private parsePayosDateTime(value: string) {
    const normalized = value.includes('T') ? value : value.replace(' ', 'T')
    const date = new Date(normalized)
    return Number.isNaN(date.getTime()) ? null : date
  }

  private toMoneyNumber(value: unknown) {
    return Number(value)
  }
}
