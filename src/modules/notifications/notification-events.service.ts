import { Injectable } from '@nestjs/common'
import roleName from '@src/common/constants/role.constant'
import type { Prisma } from 'generated/prisma/client'
import { NotificationsGateway } from './notifications.gateway'
import { NotificationsRepository } from './repositories/notifications.repo'
import { NotificationsService } from './notifications.service'

@Injectable()
export class NotificationEventsService {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsRepository: NotificationsRepository,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async notifyInvoiceIssued(invoice: {
    id: number
    tenantId: number
    renterId: number
    invoiceCode: string
    totalAmount: unknown
    dueDate: Date
  }) {
    return this.notificationsService.createAndDispatch({
      userIds: [invoice.renterId],
      tenantId: invoice.tenantId,
      title: 'Hóa đơn mới',
      content: `Hóa đơn ${invoice.invoiceCode} đã được phát hành.`,
      type: 'INVOICE',
      data: this.data('INVOICE', invoice.id, {
        invoiceCode: invoice.invoiceCode,
        amount: String(invoice.totalAmount),
        dueDate: invoice.dueDate.toISOString(),
      }),
    })
  }

  async notifyInvoiceOverdue(invoice: {
    id: number
    tenantId: number
    renterId: number
    invoiceCode: string
    debtAmount: unknown
  }) {
    return this.notificationsService.createAndDispatch({
      userIds: [invoice.renterId],
      tenantId: invoice.tenantId,
      title: 'Hóa đơn quá hạn',
      content: `Hóa đơn ${invoice.invoiceCode} đã quá hạn thanh toán.`,
      type: 'INVOICE',
      data: this.data('INVOICE', invoice.id, {
        invoiceCode: invoice.invoiceCode,
        debtAmount: String(invoice.debtAmount),
      }),
    })
  }

  async notifyPaymentPending(payment: {
    id: number
    tenantId: number
    invoiceId: number
    amount: unknown
    payer: { fullName: string }
    invoice: { invoiceCode: string }
  }) {
    const recipients = await this.notificationsRepository.findTenantNotificationRecipients(payment.tenantId, [
      roleName.LANDLORD,
      roleName.MANAGER,
      roleName.ACCOUNTANT,
    ])
    return this.notificationsService.createAndDispatch({
      userIds: recipients,
      tenantId: payment.tenantId,
      title: 'Thanh toán chờ duyệt',
      content: `${payment.payer.fullName} đã gửi xác nhận thanh toán cho hóa đơn ${payment.invoice.invoiceCode}.`,
      type: 'PAYMENT',
      data: this.data('PAYMENT', payment.id, { invoiceId: payment.invoiceId, amount: String(payment.amount) }),
    })
  }

  async notifyPaymentReviewed(payment: {
    id: number
    tenantId: number
    invoiceId: number
    amount: unknown
    status: string
    payerId: number
    invoice: { invoiceCode: string }
  }) {
    const approved = payment.status === 'SUCCESS'
    return this.notificationsService.createAndDispatch({
      userIds: [payment.payerId],
      tenantId: payment.tenantId,
      title: approved ? 'Thanh toán đã được duyệt' : 'Thanh toán bị từ chối',
      content: approved
        ? `Thanh toán cho hóa đơn ${payment.invoice.invoiceCode} đã được duyệt.`
        : `Thanh toán cho hóa đơn ${payment.invoice.invoiceCode} đã bị từ chối.`,
      type: 'PAYMENT',
      data: this.data('PAYMENT', payment.id, {
        invoiceId: payment.invoiceId,
        amount: String(payment.amount),
        status: payment.status,
      }),
    })
  }

  async notifyTicketCreated(ticket: { id: number; tenantId: number; title: string; createdById: number | null }) {
    const recipients = await this.notificationsRepository.findTenantNotificationRecipients(ticket.tenantId, [
      roleName.LANDLORD,
      roleName.MANAGER,
      roleName.MAINTENANCE_STAFF,
    ])
    return this.notificationsService.createAndDispatch({
      userIds: recipients.filter((userId) => userId !== ticket.createdById),
      tenantId: ticket.tenantId,
      title: 'Ticket mới',
      content: `Người thuê vừa gửi sự cố: ${ticket.title}.`,
      type: 'TICKET',
      data: this.data('TICKET', ticket.id),
    })
  }

  async notifyTicketUpdated(ticket: {
    id: number
    tenantId: number
    title: string
    createdById: number | null
    assignedTo: number | null
    status: string
  }) {
    const recipients = [ticket.createdById, ticket.assignedTo].filter((value): value is number => Boolean(value))
    for (const userId of recipients) {
      this.notificationsGateway.emitTicketUpdated(userId, { ticketId: ticket.id, status: ticket.status })
    }
    return this.notificationsService.createAndDispatch({
      userIds: recipients,
      tenantId: ticket.tenantId,
      title: 'Ticket được cập nhật',
      content: `Ticket ${ticket.title} đã chuyển sang trạng thái ${ticket.status}.`,
      type: 'TICKET',
      data: this.data('TICKET', ticket.id, { status: ticket.status }),
    })
  }

  async notifyTerminationChanged(
    request: { id: number; tenantId: number; status: string; contract: { contractCode: string; renterId: number } },
    event: string,
  ) {
    const staff = await this.notificationsRepository.findTenantNotificationRecipients(request.tenantId, [
      roleName.LANDLORD,
      roleName.MANAGER,
    ])
    const labels: Record<string, string> = {
      CREATED: 'Yêu cầu thanh lý mới',
      APPROVED: 'Yêu cầu thanh lý đã được duyệt',
      REJECTED: 'Yêu cầu thanh lý bị từ chối',
      CANCELED: 'Yêu cầu thanh lý đã hủy',
      COMPLETED: 'Hợp đồng đã thanh lý',
    }
    return this.notificationsService.createAndDispatch({
      userIds: Array.from(new Set([...staff, request.contract.renterId])),
      tenantId: request.tenantId,
      title: labels[event] ?? 'Cập nhật thanh lý hợp đồng',
      content: `Hợp đồng ${request.contract.contractCode}: ${request.status}.`,
      type: 'CONTRACT',
      data: this.data('CONTRACT_TERMINATION', request.id, { event, status: request.status }),
    })
  }

  async notifyHandoverChanged(
    handover: {
      id: number
      tenantId: number
      type: string
      status: string
      contract: { contractCode: string; renterId: number }
    },
    event: string,
  ) {
    const staff = await this.notificationsRepository.findTenantNotificationRecipients(handover.tenantId, [
      roleName.LANDLORD,
      roleName.MANAGER,
    ])
    return this.notificationsService.createAndDispatch({
      userIds: Array.from(new Set([...staff, handover.contract.renterId])),
      tenantId: handover.tenantId,
      title: handover.type === 'CHECKIN' ? 'Cập nhật bàn giao nhận phòng' : 'Cập nhật bàn giao trả phòng',
      content: `Biên bản của hợp đồng ${handover.contract.contractCode}: ${handover.status}.`,
      type: 'CONTRACT',
      data: this.data('HANDOVER', handover.id, { event, type: handover.type, status: handover.status }),
    })
  }

  async notifyReviewUpdated(review: { id: number; tenantId: number; reviewerId: number; status: string }) {
    const labels: Record<string, string> = {
      APPROVED: 'Đánh giá đã được duyệt',
      REJECTED: 'Đánh giá bị từ chối',
      HIDDEN: 'Đánh giá đã bị ẩn',
    }
    return this.notificationsService.createAndDispatch({
      userIds: [review.reviewerId],
      tenantId: review.tenantId,
      title: labels[review.status] ?? 'Đánh giá được cập nhật',
      content: `Đánh giá của bạn đã chuyển sang trạng thái ${review.status}.`,
      type: 'REVIEW',
      data: this.data('REVIEW', review.id, { status: review.status }),
    })
  }

  async notifyReportUpdated(report: { id: number; reporterId: number; targetTenantId: number | null; status: string }) {
    const resolved = report.status === 'RESOLVED'
    return this.notificationsService.createAndDispatch({
      userIds: [report.reporterId],
      tenantId: report.targetTenantId,
      title: resolved ? 'Báo cáo đã được xử lý' : 'Báo cáo bị từ chối',
      content: resolved ? 'Báo cáo của bạn đã được quản trị viên xử lý.' : 'Báo cáo của bạn không đủ căn cứ để xử lý.',
      type: 'REPORT',
      data: this.data('REPORT', report.id, { status: report.status }),
    })
  }
  private data(sourceType: string, sourceId: number, extra: Record<string, unknown> = {}): Prisma.InputJsonValue {
    return { sourceType, sourceId, ...extra }
  }
}
