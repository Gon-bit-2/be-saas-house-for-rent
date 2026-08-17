import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import { Prisma } from 'generated/prisma/client'
import type { DebtStatus, InvoiceStatus, PaymentMethod } from 'generated/prisma/client'

const PAYABLE_INVOICE_STATUSES: InvoiceStatus[] = ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE']

export const paymentQrSelect = {
  id: true,
  tenantId: true,
  invoiceId: true,
  provider: true,
  orderCode: true,
  paymentLinkId: true,
  qrContent: true,
  qrImageUrl: true,
  checkoutUrl: true,
  amount: true,
  providerStatus: true,
  expiredAt: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PaymentQrCodeSelect

export const paymentSelect = {
  id: true,
  tenantId: true,
  invoiceId: true,
  payerId: true,
  qrCodeId: true,
  amount: true,
  method: true,
  provider: true,
  transactionCode: true,
  status: true,
  paidAt: true,
  submittedAt: true,
  evidenceUrl: true,
  renterNote: true,
  approvedById: true,
  approvedAt: true,
  rejectedById: true,
  rejectedAt: true,
  landlordNote: true,
  createdAt: true,
  updatedAt: true,
  invoice: {
    select: {
      id: true,
      invoiceCode: true,
      status: true,
      totalAmount: true,
      paidAmount: true,
      debtAmount: true,
      dueDate: true,
      room: { select: { id: true, roomCode: true, title: true } },
    },
  },
  payer: { select: { id: true, fullName: true, email: true, phone: true } },
  qrCode: { select: paymentQrSelect },
  approvedBy: { select: { id: true, fullName: true, email: true } },
  rejectedBy: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.PaymentSelect

export type PayableInvoice = {
  id: number
  tenantId: number
  renterId: number
  invoiceCode: string
  status: InvoiceStatus
  totalAmount: unknown
  paidAmount: unknown
  debtAmount: unknown
  dueDate: Date
  renter: { id: number; fullName: string; email: string; phone: string | null }
  room: { id: number; roomCode: string; title: string }
}

export type CreateWebhookLogInput = {
  provider: string
  tenantId?: number | null
  invoiceId?: number | null
  subscriptionPaymentId?: number | null
  orderCode?: number | null
  paymentLinkId?: string | null
  reference?: string | null
  transactionCode?: string | null
  amount?: number | null
  currency?: string | null
  providerCode?: string | null
  providerDesc?: string | null
  success?: boolean | null
  transactionDateTime?: Date | null
  payload: Prisma.InputJsonValue
  payloadDigest: string
  digestKeyVersion: number
  signatureValid: boolean
  status: 'RECEIVED' | 'PROCESSED' | 'FAILED' | 'IGNORED'
  errorMessage?: string | null
}

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findPaymentsAndCount(where: Prisma.PaymentWhereInput, skip: number, take: number) {
    return this.prismaService.$transaction([
      this.prismaService.payment.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: paymentSelect,
      }),
      this.prismaService.payment.count({ where }),
    ])
  }

  async findTenantPayment(tenantId: number, id: number) {
    return this.prismaService.payment.findFirst({ where: { id, tenantId }, select: paymentSelect })
  }

  async findMyPayment(userId: number, id: number) {
    return this.prismaService.payment.findFirst({ where: { id, payerId: userId }, select: paymentSelect })
  }

  async findMyPayableInvoice(userId: number, invoiceId: number) {
    return this.prismaService.invoice.findFirst({
      where: { id: invoiceId, renterId: userId, deletedAt: null },
      select: {
        id: true,
        tenantId: true,
        renterId: true,
        invoiceCode: true,
        status: true,
        totalAmount: true,
        paidAmount: true,
        debtAmount: true,
        dueDate: true,
        renter: { select: { id: true, fullName: true, email: true, phone: true } },
        room: { select: { id: true, roomCode: true, title: true } },
      },
    })
  }

  async findTenantPayableInvoice(tenantId: number, invoiceId: number) {
    return this.prismaService.invoice.findFirst({
      where: { id: invoiceId, tenantId, deletedAt: null },
      select: {
        id: true,
        tenantId: true,
        renterId: true,
        invoiceCode: true,
        status: true,
        totalAmount: true,
        paidAmount: true,
        debtAmount: true,
        dueDate: true,
        renter: { select: { id: true, fullName: true, email: true, phone: true } },
        room: { select: { id: true, roomCode: true, title: true } },
      },
    })
  }

  async findActiveQr(invoiceId: number, amount: number, now: Date) {
    return this.prismaService.paymentQrCode.findFirst({
      where: {
        invoiceId,
        provider: 'PayOS',
        status: 'ACTIVE',
        expiredAt: { gt: now },
        amount,
        paymentLinkId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      select: paymentQrSelect,
    })
  }

  async createQrDraft(input: { tenantId: number; invoiceId: number; amount: number; expiredAt: Date }) {
    return this.prismaService.paymentQrCode.create({
      data: {
        tenantId: input.tenantId,
        invoiceId: input.invoiceId,
        provider: 'PayOS',
        amount: input.amount,
        expiredAt: input.expiredAt,
        status: 'ACTIVE',
      },
      select: paymentQrSelect,
    })
  }

  async updateQrWithPayos(
    id: number,
    data: { paymentLinkId: string; checkoutUrl: string; qrContent: string; providerStatus: string | null },
  ) {
    return this.prismaService.paymentQrCode.update({
      where: { id },
      data,
      select: paymentQrSelect,
    })
  }

  async markQrCanceled(id: number, providerStatus?: string) {
    return this.prismaService.paymentQrCode.update({
      where: { id },
      data: { status: 'CANCELED', providerStatus },
      select: paymentQrSelect,
    })
  }

  async createRenterConfirmation(input: {
    tenantId: number
    invoiceId: number
    payerId: number
    amount: number
    transactionCode?: string
    evidenceUrl?: string
    renterNote?: string
    paidAt?: Date
  }) {
    return this.prismaService.payment.create({
      data: {
        tenantId: input.tenantId,
        invoiceId: input.invoiceId,
        payerId: input.payerId,
        amount: input.amount,
        method: 'BANK_TRANSFER',
        provider: 'MANUAL_CONFIRMATION',
        transactionCode: input.transactionCode,
        status: 'PENDING',
        paidAt: input.paidAt,
        submittedAt: new Date(),
        evidenceUrl: input.evidenceUrl,
        renterNote: input.renterNote,
        createdById: input.payerId,
        updatedById: input.payerId,
      },
      select: paymentSelect,
    })
  }

  async findQrByPayosIdentifiers(orderCode: number, paymentLinkId: string) {
    return this.prismaService.paymentQrCode.findFirst({
      where: { provider: 'PayOS', orderCode, paymentLinkId },
      select: {
        ...paymentQrSelect,
        invoice: {
          select: {
            id: true,
            tenantId: true,
            renterId: true,
            status: true,
            debtAmount: true,
          },
        },
      },
    })
  }

  async findPaymentByProviderReference(provider: string, transactionCode: string) {
    return this.prismaService.payment.findFirst({ where: { provider, transactionCode }, select: paymentSelect })
  }

  async createPendingWebhookPayment(input: {
    tenantId: number
    invoiceId: number
    payerId: number
    qrCodeId: number
    amount: number
    transactionCode: string
    paidAt: Date | null
  }) {
    try {
      const payment = await this.prismaService.payment.create({
        data: {
          tenantId: input.tenantId,
          invoiceId: input.invoiceId,
          payerId: input.payerId,
          qrCodeId: input.qrCodeId,
          amount: input.amount,
          method: 'QR',
          provider: 'PayOS',
          transactionCode: input.transactionCode,
          status: 'PENDING',
          paidAt: input.paidAt,
          submittedAt: new Date(),
          renterNote: 'PayOS webhook verified',
        },
        select: paymentSelect,
      })
      return { payment, created: true as const }
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error
      }
      const payment = await this.findPaymentByProviderReference('PayOS', input.transactionCode)
      if (!payment) {
        throw error
      }
      return { payment, created: false as const }
    }
  }

  async createWebhookLog(input: CreateWebhookLogInput) {
    return this.prismaService.paymentWebhookLog.create({
      data: {
        provider: input.provider,
        tenantId: input.tenantId,
        invoiceId: input.invoiceId,
        subscriptionPaymentId: input.subscriptionPaymentId,
        orderCode: input.orderCode,
        paymentLinkId: input.paymentLinkId,
        reference: input.reference,
        transactionCode: input.transactionCode,
        amount: input.amount,
        currency: input.currency,
        providerCode: input.providerCode,
        providerDesc: input.providerDesc,
        success: input.success,
        transactionDateTime: input.transactionDateTime,
        payload: input.payload,
        payloadDigest: input.payloadDigest,
        digestKeyVersion: input.digestKeyVersion,
        signatureValid: input.signatureValid,
        status: input.status,
        errorMessage: input.errorMessage,
      },
    })
  }

  async deleteWebhookLogsBefore(cutoff: Date, batchSize: number) {
    return this.prismaService.$executeRaw`
      DELETE FROM payment_webhook_logs
      WHERE id IN (
        SELECT id
        FROM payment_webhook_logs
        WHERE received_at < ${cutoff}
        ORDER BY id ASC
        LIMIT ${batchSize}
      )
    `
  }

  async approvePayment(tenantId: number, paymentId: number, actorId: number, landlordNote?: string) {
    return this.prismaService.$transaction(async (tx) => {
      const paymentReference = await tx.payment.findFirst({
        where: { id: paymentId, tenantId },
        select: { id: true, invoiceId: true },
      })
      if (!paymentReference) {
        throw new NotFoundException('Không tìm thấy thanh toán trong tenant hiện tại')
      }

      const lockedInvoices = await tx.$queryRaw<Array<{ id: number }>>(
        Prisma.sql`SELECT id FROM invoices WHERE id = ${paymentReference.invoiceId} AND tenant_id = ${tenantId} FOR UPDATE`,
      )
      if (lockedInvoices.length !== 1) {
        throw new NotFoundException('Không tìm thấy hóa đơn trong tenant hiện tại')
      }

      const payment = await tx.payment.findFirstOrThrow({
        where: { id: paymentId, tenantId },
        select: {
          id: true,
          amount: true,
          status: true,
          invoiceId: true,
          qrCodeId: true,
          paidAt: true,
          invoice: { select: { id: true, status: true, totalAmount: true, debtAmount: true, dueDate: true } },
        },
      })
      if (payment.status !== 'PENDING') {
        throw new ConflictException('Thanh toán đã được xử lý')
      }
      if (!PAYABLE_INVOICE_STATUSES.includes(payment.invoice.status)) {
        throw new BadRequestException('Hóa đơn không còn ở trạng thái có thể ghi nhận thanh toán')
      }
      if (new Prisma.Decimal(payment.amount).greaterThan(new Prisma.Decimal(payment.invoice.debtAmount))) {
        throw new BadRequestException('Số tiền thanh toán lớn hơn công nợ còn lại')
      }

      const transitioned = await tx.payment.updateMany({
        where: { id: payment.id, tenantId, status: 'PENDING' },
        data: {
          status: 'SUCCESS',
          paidAt: payment.paidAt ?? new Date(),
          approvedById: actorId,
          approvedAt: new Date(),
          rejectedById: null,
          rejectedAt: null,
          landlordNote,
          updatedById: actorId,
        },
      })
      if (transitioned.count !== 1) {
        throw new ConflictException('Thanh toán đã được xử lý')
      }

      const successfulPayments = await tx.payment.aggregate({
        where: { invoiceId: payment.invoiceId, status: 'SUCCESS' },
        _sum: { amount: true },
      })
      const newPaidAmount = successfulPayments._sum.amount ?? new Prisma.Decimal(0)
      const totalAmount = new Prisma.Decimal(payment.invoice.totalAmount)
      if (newPaidAmount.greaterThan(totalAmount)) {
        throw new ConflictException('Tổng thanh toán vượt quá giá trị hóa đơn')
      }
      const remainingAmount = totalAmount.minus(newPaidAmount)
      const invoiceStatus = this.resolveInvoiceStatus(remainingAmount, payment.invoice.dueDate)
      const debtStatus = this.resolveDebtStatus(remainingAmount, payment.invoice.dueDate)
      const resolvedAt = debtStatus === 'PAID' ? new Date() : null

      await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          paidAmount: newPaidAmount,
          debtAmount: remainingAmount,
          status: invoiceStatus,
          updatedById: actorId,
        },
      })
      await tx.debt.update({
        where: { invoiceId: payment.invoiceId },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount,
          status: debtStatus,
          resolvedAt,
        },
      })
      if (payment.qrCodeId) {
        await tx.paymentQrCode.update({
          where: { id: payment.qrCodeId },
          data: { status: remainingAmount.isZero() ? 'PAID' : 'ACTIVE' },
        })
      }

      return tx.payment.findUniqueOrThrow({ where: { id: payment.id }, select: paymentSelect })
    })
  }

  async rejectPayment(tenantId: number, paymentId: number, actorId: number, landlordNote?: string) {
    const payment = await this.prismaService.payment.findFirst({
      where: { id: paymentId, tenantId },
      select: { id: true },
    })
    if (!payment) {
      throw new NotFoundException('Không tìm thấy thanh toán trong tenant hiện tại')
    }

    const transitioned = await this.prismaService.payment.updateMany({
      where: { id: paymentId, tenantId, status: 'PENDING' },
      data: {
        status: 'FAILED',
        rejectedById: actorId,
        rejectedAt: new Date(),
        approvedById: null,
        approvedAt: null,
        landlordNote,
        updatedById: actorId,
      },
    })
    if (transitioned.count !== 1) {
      throw new ConflictException('Thanh toán đã được xử lý')
    }
    return this.prismaService.payment.findUniqueOrThrow({ where: { id: paymentId }, select: paymentSelect })
  }

  async recordManualPayment(
    tenantId: number,
    invoiceId: number,
    actorId: number,
    amount: number,
    method: PaymentMethod,
    paidAt: Date,
    landlordNote?: string,
  ) {
    return this.prismaService.$transaction(async (tx) => {
      const lockedInvoices = await tx.$queryRaw<Array<{ id: number }>>(
        Prisma.sql`SELECT id FROM invoices WHERE id = ${invoiceId} AND tenant_id = ${tenantId} FOR UPDATE`,
      )
      if (lockedInvoices.length !== 1) {
        throw new NotFoundException('Không tìm thấy hóa đơn trong tenant hiện tại')
      }

      const invoice = await tx.invoice.findFirstOrThrow({
        where: { id: invoiceId, tenantId },
        select: { id: true, status: true, totalAmount: true, debtAmount: true, dueDate: true, renterId: true },
      })

      if (!PAYABLE_INVOICE_STATUSES.includes(invoice.status)) {
        throw new BadRequestException('Hóa đơn không còn ở trạng thái có thể ghi nhận thanh toán')
      }
      if (new Prisma.Decimal(amount).greaterThan(new Prisma.Decimal(invoice.debtAmount))) {
        throw new BadRequestException('Số tiền thanh toán lớn hơn công nợ còn lại')
      }

      const payment = await tx.payment.create({
        data: {
          tenantId,
          invoiceId,
          payerId: invoice.renterId,
          amount,
          method,
          status: 'SUCCESS',
          paidAt,
          approvedById: actorId,
          approvedAt: new Date(),
          landlordNote,
        },
      })

      const successfulPayments = await tx.payment.aggregate({
        where: { invoiceId, status: 'SUCCESS' },
        _sum: { amount: true },
      })
      const newPaidAmount = successfulPayments._sum.amount ?? new Prisma.Decimal(0)
      const totalAmount = new Prisma.Decimal(invoice.totalAmount)
      
      // Should not happen, but safe check
      if (newPaidAmount.greaterThan(totalAmount)) {
        throw new ConflictException('Tổng thanh toán vượt quá giá trị hóa đơn')
      }

      const remainingAmount = totalAmount.minus(newPaidAmount)
      const invoiceStatus = this.resolveInvoiceStatus(remainingAmount, invoice.dueDate)
      const debtStatus = this.resolveDebtStatus(remainingAmount, invoice.dueDate)
      const resolvedAt = debtStatus === 'PAID' ? new Date() : null

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount,
          debtAmount: remainingAmount,
          status: invoiceStatus,
          updatedById: actorId,
        },
      })
      await tx.debt.update({
        where: { invoiceId },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount,
          status: debtStatus,
          resolvedAt,
        },
      })

      if (remainingAmount.isZero()) {
        await tx.paymentQrCode.updateMany({
          where: { invoiceId, status: 'ACTIVE' },
          data: { status: 'PAID' },
        })
      }

      return tx.payment.findUniqueOrThrow({ where: { id: payment.id }, select: paymentSelect })
    })
  }

  private resolveInvoiceStatus(remainingAmount: Prisma.Decimal, dueDate: Date): InvoiceStatus {
    if (remainingAmount.isZero()) return 'PAID'
    return this.isPastDue(dueDate) ? 'OVERDUE' : 'PARTIALLY_PAID'
  }

  private resolveDebtStatus(remainingAmount: Prisma.Decimal, dueDate: Date): DebtStatus {
    if (remainingAmount.isZero()) return 'PAID'
    return this.isPastDue(dueDate) ? 'OVERDUE' : 'PARTIAL'
  }

  private isPastDue(dueDate: Date) {
    const due = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()))
    const now = new Date()
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    return due.getTime() < today.getTime()
  }
}
