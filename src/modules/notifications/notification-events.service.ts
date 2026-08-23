import { Injectable, Logger } from '@nestjs/common'
import roleName from '@src/common/constants/role.constant'
import type { Prisma } from 'generated/prisma/client'
import { NotificationsGateway } from './notifications.gateway'
import { NotificationsRepository } from './repositories/notifications.repo'
import { NotificationsService } from './notifications.service'

type TicketEventSource = {
  id: number
  tenantId: number
  title: string
  createdById: number | null
  assignedTo: number | null
  status: string
  contract: { renterId: number } | null
}

const statusMap: Record<string, string> = {
  PUBLISHED: 'Đã duyệt',
  PENDING_REVIEW: 'Chờ duyệt',
  REJECTED: 'Từ chối',
  HIDDEN: 'Bị ẩn',
  PENDING: 'Chờ xử lý',
  APPROVED: 'Đã chấp thuận',
  RESOLVED: 'Đã giải quyết',
  CONFIRMED: 'Đã xác nhận',
  CANCELLED: 'Đã hủy',
  CANCELED: 'Đã hủy',
  REQUESTED: 'Đã yêu cầu',
  COMPLETED: 'Đã hoàn thành',
  CLOSED: 'Đã đóng',
  OPEN: 'Mở',
  IN_PROGRESS: 'Đang xử lý',
  REVIEWING: 'Đang xem xét',
  NEED_MORE_INFO: 'Cần bổ sung thông tin'
}

function translateStatus(status: string): string {
  return statusMap[status] || status
}

@Injectable()
export class NotificationEventsService {
  private readonly logger = new Logger(NotificationEventsService.name)

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
    return this.bestEffort('TICKET_CREATED', async () => {
      const recipients = await this.notificationsRepository.findTenantNotificationRecipients(ticket.tenantId, [
        roleName.LANDLORD,
        roleName.MANAGER,
      ])
      return this.notificationsService.createAndDispatch({
        userIds: recipients.filter((userId) => userId !== ticket.createdById),
        tenantId: ticket.tenantId,
        title: 'Ticket mới',
        content: `Người thuê vừa gửi sự cố: ${ticket.title}.`,
        type: 'TICKET',
        data: this.data('TICKET', ticket.id, { event: 'TICKET_CREATED', ticketId: ticket.id }),
      })
    })
  }

  async notifyMarketplaceSubmitted(room: { id: number; tenantId: number; roomCode: string; title: string }) {
    return this.bestEffort('MARKETPLACE_SUBMITTED', async () => {
      const recipients = await this.notificationsRepository.findSystemAdminRecipients()
      return this.notificationsService.createAndDispatch({
        userIds: recipients,
        tenantId: room.tenantId,
        title: 'Tin đăng chờ kiểm duyệt',
        content: `Phòng ${room.roomCode} - ${room.title} vừa được gửi duyệt.`,
        type: 'MARKETPLACE',
        data: this.data('ROOM', room.id, {
          event: 'MARKETPLACE_SUBMITTED',
          roomId: room.id,
        }),
      })
    })
  }

  async notifyMarketplaceModerated(room: {
    id: number
    tenantId: number
    roomCode: string
    title: string
    marketplaceStatus: string
  }) {
    return this.bestEffort('MARKETPLACE_MODERATED', async () => {
      const recipients = await this.notificationsRepository.findTenantNotificationRecipients(room.tenantId, [
        roleName.LANDLORD,
        roleName.MANAGER,
      ])
      return this.notificationsService.createAndDispatch({
        userIds: recipients,
        tenantId: room.tenantId,
        title: 'Trạng thái tin đăng đã thay đổi',
        content: `Tin phòng ${room.roomCode} đã chuyển sang trạng thái ${translateStatus(room.marketplaceStatus)}.`,
        type: 'MARKETPLACE',
        data: this.data('ROOM', room.id, {
          event: 'MARKETPLACE_STATUS_CHANGED',
          roomId: room.id,
          status: room.marketplaceStatus,
        }),
      })
    })
  }

  async notifyRentalRequestCreated(request: {
    id: number
    tenantId: number
    roomId: number
    renterId: number
    room: { roomCode: string; title: string }
  }) {
    return this.bestEffort('RENTAL_REQUEST_CREATED', async () => {
      const recipients = await this.notificationsRepository.findTenantNotificationRecipients(request.tenantId, [
        roleName.LANDLORD,
        roleName.MANAGER,
      ])
      return this.notificationsService.createAndDispatch({
        userIds: recipients.filter((userId) => userId !== request.renterId),
        tenantId: request.tenantId,
        title: 'Yêu cầu thuê mới',
        content: `Phòng ${request.room.roomCode} vừa nhận một yêu cầu thuê.`,
        type: 'RENTAL_REQUEST',
        data: this.data('RENTAL_REQUEST', request.id, {
          event: 'RENTAL_REQUEST_CREATED',
          roomId: request.roomId,
          requestId: request.id,
        }),
      })
    })
  }

  async notifyRentalRequestChanged(request: {
    id: number
    tenantId: number
    roomId: number
    renterId: number
    status: string
    room: { roomCode: string }
  }) {
    return this.bestEffort('RENTAL_REQUEST_STATUS_CHANGED', () =>
      this.notificationsService.createAndDispatch({
        userIds: [request.renterId],
        tenantId: request.tenantId,
        title: 'Yêu cầu thuê đã được cập nhật',
        content: `Yêu cầu thuê phòng ${request.room.roomCode} đã chuyển sang trạng thái ${translateStatus(request.status)}.`,
        type: 'RENTAL_REQUEST',
        data: this.data('RENTAL_REQUEST', request.id, {
          event: 'RENTAL_REQUEST_STATUS_CHANGED',
          roomId: request.roomId,
          requestId: request.id,
          status: request.status,
        }),
      }),
    )
  }

  async notifyViewingAppointmentCreated(appointment: {
    id: number
    tenantId: number
    roomId: number
    renterId: number
    room: { roomCode: string }
  }) {
    return this.bestEffort('APPOINTMENT_CREATED', async () => {
      const recipients = await this.notificationsRepository.findTenantNotificationRecipients(appointment.tenantId, [
        roleName.LANDLORD,
        roleName.MANAGER,
      ])
      return this.notificationsService.createAndDispatch({
        userIds: recipients.filter((userId) => userId !== appointment.renterId),
        tenantId: appointment.tenantId,
        title: 'Lịch xem phòng mới',
        content: `Phòng ${appointment.room.roomCode} vừa nhận một lịch hẹn xem phòng.`,
        type: 'APPOINTMENT',
        data: this.data('APPOINTMENT', appointment.id, {
          event: 'APPOINTMENT_CREATED',
          roomId: appointment.roomId,
          appointmentId: appointment.id,
        }),
      })
    })
  }

  async notifyViewingAppointmentChanged(appointment: {
    id: number
    tenantId: number
    roomId: number
    renterId: number
    assignedStaffId: number | null
    status: string
    room: { roomCode: string }
  }) {
    return this.bestEffort('APPOINTMENT_STATUS_CHANGED', () =>
      this.notificationsService.createAndDispatch({
        userIds: Array.from(
          new Set(
            [appointment.renterId, appointment.assignedStaffId].filter((value): value is number => value !== null),
          ),
        ),
        tenantId: appointment.tenantId,
        title: 'Lịch xem phòng đã được cập nhật',
        content: `Lịch xem phòng ${appointment.room.roomCode} đã chuyển sang trạng thái ${translateStatus(appointment.status)}.`,
        type: 'APPOINTMENT',
        data: this.data('APPOINTMENT', appointment.id, {
          event: 'APPOINTMENT_STATUS_CHANGED',
          roomId: appointment.roomId,
          appointmentId: appointment.id,
          status: appointment.status,
        }),
      }),
    )
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
      content: `Ticket ${ticket.title} đã chuyển sang trạng thái ${translateStatus(ticket.status)}.`,
      type: 'TICKET',
      data: this.data('TICKET', ticket.id, { status: ticket.status }),
    })
  }

  async notifyTicketAssigned(ticket: TicketEventSource) {
    return this.bestEffort('TICKET_ASSIGNED', () =>
      this.dispatchTicketNotification(
        ticket,
        [ticket.assignedTo, ticket.createdById, ticket.contract?.renterId ?? null],
        'Ticket đã được phân công',
        `Ticket ${ticket.title} đã được phân công xử lý.`,
        'TICKET_ASSIGNED',
      ),
    )
  }

  async notifyTicketStatusChanged(ticket: TicketEventSource) {
    return this.bestEffort('TICKET_STATUS_CHANGED', () =>
      this.dispatchTicketNotification(
        ticket,
        [ticket.createdById, ticket.contract?.renterId ?? null, ticket.assignedTo],
        'Trạng thái ticket đã thay đổi',
        `Ticket ${ticket.title} đã chuyển sang trạng thái ${translateStatus(ticket.status)}.`,
        'TICKET_STATUS_CHANGED',
      ),
    )
  }

  async notifyTicketCommented(ticket: TicketEventSource, actorId: number, isStaff: boolean, isInternal: boolean) {
    return this.bestEffort('TICKET_COMMENTED', async () => {
      let recipients: Array<number | null>
      if (isInternal) {
        const staff = await this.notificationsRepository.findTenantNotificationRecipients(ticket.tenantId, [
          roleName.LANDLORD,
          roleName.MANAGER,
        ])
        recipients = [...staff, ticket.assignedTo]
      } else if (isStaff) {
        recipients = [ticket.createdById, ticket.contract?.renterId ?? null]
      } else {
        const staff = await this.notificationsRepository.findTenantNotificationRecipients(ticket.tenantId, [
          roleName.LANDLORD,
          roleName.MANAGER,
        ])
        recipients = [ticket.assignedTo, ...staff]
      }
      return this.dispatchTicketNotification(
        ticket,
        recipients.filter((userId) => userId !== actorId),
        isInternal ? 'Bình luận nội bộ mới' : 'Bình luận ticket mới',
        `Ticket ${ticket.title} vừa có bình luận mới.`,
        isInternal ? 'TICKET_INTERNAL_COMMENT_ADDED' : 'TICKET_COMMENT_ADDED',
      )
    })
  }

  async notifyTicketAttachmentAdded(ticket: TicketEventSource, actorId: number, isStaff: boolean) {
    return this.bestEffort('TICKET_ATTACHMENT_ADDED', async () => {
      let recipients: Array<number | null>
      if (isStaff) {
        recipients = [ticket.createdById, ticket.contract?.renterId ?? null]
      } else {
        const staff = await this.notificationsRepository.findTenantNotificationRecipients(ticket.tenantId, [
          roleName.LANDLORD,
          roleName.MANAGER,
        ])
        recipients = [ticket.assignedTo, ...staff]
      }
      return this.dispatchTicketNotification(
        ticket,
        recipients.filter((userId) => userId !== actorId),
        'Tệp đính kèm ticket mới',
        `Ticket ${ticket.title} vừa có tệp đính kèm mới.`,
        'TICKET_ATTACHMENT_ADDED',
      )
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
      content: `Đánh giá của bạn đã chuyển sang trạng thái ${translateStatus(review.status)}.`,
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
  private async bestEffort<T>(event: string, action: () => Promise<T>): Promise<T | null> {
    try {
      return await action()
    } catch (error) {
      this.logger.error(
        `Notification ${event} failed after business commit`,
        error instanceof Error ? error.stack : undefined,
      )
      return null
    }
  }

  private dispatchTicketNotification(
    ticket: TicketEventSource,
    recipients: Array<number | null>,
    title: string,
    content: string,
    event: string,
  ) {
    const userIds = Array.from(new Set(recipients.filter((value): value is number => value !== null)))
    for (const userId of userIds) {
      this.notificationsGateway.emitTicketUpdated(userId, { ticketId: ticket.id, status: ticket.status })
    }
    return this.notificationsService.createAndDispatch({
      userIds,
      tenantId: ticket.tenantId,
      title,
      content,
      type: 'TICKET',
      data: this.data('TICKET', ticket.id, { event, ticketId: ticket.id, status: ticket.status }),
    })
  }

  private data(sourceType: string, sourceId: number, extra: Record<string, unknown> = {}): Prisma.InputJsonValue {
    const event = typeof extra.event === 'string' ? extra.event : `${sourceType}_UPDATED`
    return { event, sourceType, sourceId, ...extra }
  }
}
