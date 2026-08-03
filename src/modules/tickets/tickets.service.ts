import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import roleName, { RoleNameType } from '@src/common/constants/role.constant'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import envConfig from '@src/config/env.config'
import { NotificationEventsService } from '@src/modules/notifications/notification-events.service'
import { CloudinaryService } from '@src/shared/modules/services/cloudinary.service'
import { TenantAccessService } from '@src/shared/modules/services/tenant-access.service'
import type { Prisma, TicketStatus } from 'generated/prisma/client'
import { extname } from 'node:path'
import sharp from 'sharp'
import type {
  TAssignTicketBodySchema,
  TCloseTicketBodySchema,
  TCreateTicketAttachmentBodySchema,
  TCreateTicketBodySchema,
  TCreateTicketCommentBodySchema,
  TListTicketsQuerySchema,
  TTicketRelationsQuerySchema,
  TUpdateTicketStatusBodySchema,
} from './model/tickets.model'
import { TicketsRepository } from './repositories/tickets.repo'

const ASSIGNABLE_ROLES = [roleName.LANDLORD, roleName.MANAGER, roleName.MAINTENANCE_STAFF]
const TERMINAL_STATUSES: TicketStatus[] = ['CLOSED', 'CANCELED']
const TICKET_TRANSITIONS: Partial<Record<TicketStatus, TicketStatus[]>> = {
  OPEN: ['IN_PROGRESS', 'CANCELED'],
  IN_PROGRESS: ['WAITING_RENTER', 'RESOLVED', 'CANCELED'],
  WAITING_RENTER: ['IN_PROGRESS', 'RESOLVED', 'CANCELED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
}
const IMAGE_TYPES = new Map([
  ['image/jpeg', { extensions: ['.jpg', '.jpeg'], format: 'jpeg' }],
  ['image/png', { extensions: ['.png'], format: 'png' }],
  ['image/webp', { extensions: ['.webp'], format: 'webp' }],
])

@Injectable()
export class TicketsService {
  constructor(
    private readonly ticketsRepository: TicketsRepository,
    private readonly tenantAccessService: TenantAccessService,
    private readonly notificationEventsService: NotificationEventsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(userId: number, body: TCreateTicketBodySchema) {
    const contract = await this.ticketsRepository.findActiveRenterContractForRoom(userId, body.roomId, body.contractId)
    if (!contract) {
      throw new NotFoundException('Không tìm thấy hợp đồng đang hiệu lực của bạn cho phòng này')
    }

    const ticket = await this.ticketsRepository.createTicket({
      tenantId: contract.tenantId,
      roomId: contract.roomId,
      contractId: contract.id,
      title: body.title,
      description: body.description,
      category: body.category,
      priority: body.priority,
      createdById: userId,
      attachments: body.attachments,
    })
    await this.notificationEventsService.notifyTicketCreated(ticket)
    return this.withRelationCounts(ticket)
  }

  async listMine(userId: number, query: TListTicketsQuerySchema) {
    const { page, limit, skip } = normalizePagination(query)
    const where = this.buildTicketWhere(query, {
      OR: [{ createdById: userId }, { contract: { OR: [{ renterId: userId }, { members: { some: { userId } } }] } }],
    })
    const [tickets, total] = await this.ticketsRepository.findRenterTicketsAndCount(where, skip, limit)
    return buildPaginatedResult(
      tickets.map((ticket) => this.withRelationCounts(ticket)),
      total,
      page,
      limit,
    )
  }

  async getMine(userId: number, id: number) {
    const ticket = await this.ticketsRepository.findUserTicket(userId, id)
    if (!ticket) {
      throw new NotFoundException('Không tìm thấy ticket của bạn')
    }
    return this.withRelationCounts(ticket)
  }

  async listForLandlord(userId: number, query: TListTicketsQuerySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const { page, limit, skip } = normalizePagination(query)
    const where = this.buildTicketWhere(query, {
      tenantId: tenant.tenantId,
      ...(tenant.roleId === roleName.MAINTENANCE_STAFF ? { assignedTo: userId } : {}),
    })
    const [tickets, total] = await this.ticketsRepository.findStaffTicketsAndCount(where, skip, limit)
    return buildPaginatedResult(
      tickets.map((ticket) => this.withRelationCounts(ticket)),
      total,
      page,
      limit,
    )
  }

  async getForLandlord(userId: number, id: number) {
    const { ticket } = await this.getStaffTicketOrThrow(userId, id)
    return this.withRelationCounts(ticket)
  }

  async listMyComments(userId: number, id: number, query: TTicketRelationsQuerySchema) {
    const ticket = await this.getMine(userId, id)
    const { page, limit, skip } = normalizePagination(query)
    const [comments, total] = await this.ticketsRepository.findRenterCommentsAndCount(ticket.id, skip, limit)
    return buildPaginatedResult(comments, total, page, limit)
  }

  async listMyAttachments(userId: number, id: number, query: TTicketRelationsQuerySchema) {
    const ticket = await this.getMine(userId, id)
    const { page, limit, skip } = normalizePagination(query)
    const [attachments, total] = await this.ticketsRepository.findRenterAttachmentsAndCount(ticket.id, skip, limit)
    return buildPaginatedResult(attachments, total, page, limit)
  }

  async listStaffComments(userId: number, id: number, query: TTicketRelationsQuerySchema) {
    const { ticket } = await this.getStaffTicketOrThrow(userId, id)
    const { page, limit, skip } = normalizePagination(query)
    const [comments, total] = await this.ticketsRepository.findStaffCommentsAndCount(ticket.id, skip, limit)
    return buildPaginatedResult(comments, total, page, limit)
  }

  async listStaffAttachments(userId: number, id: number, query: TTicketRelationsQuerySchema) {
    const { ticket } = await this.getStaffTicketOrThrow(userId, id)
    const { page, limit, skip } = normalizePagination(query)
    const [attachments, total] = await this.ticketsRepository.findStaffAttachmentsAndCount(ticket.id, skip, limit)
    return buildPaginatedResult(attachments, total, page, limit)
  }

  async updateStatus(userId: number, id: number, body: TUpdateTicketStatusBodySchema) {
    const { tenant, ticket } = await this.getStaffTicketOrThrow(userId, id)
    if (!TICKET_TRANSITIONS[ticket.status]?.includes(body.status) || body.status === 'CLOSED') {
      throw new BadRequestException(`Không thể chuyển ticket từ ${ticket.status} sang ${body.status}`)
    }
    if (tenant.roleId === roleName.MAINTENANCE_STAFF && body.status === 'CANCELED') {
      throw new NotFoundException('Không tìm thấy ticket trong phạm vi xử lý')
    }
    const updated = await this.transitionOrConflict({
      tenantId: tenant.tenantId,
      id,
      expectedStatus: ticket.status,
      status: body.status,
      actorId: userId,
      action: 'UPDATE_TICKET_STATUS',
    })
    await this.notificationEventsService.notifyTicketStatusChanged(updated)
    return this.withRelationCounts(updated)
  }

  async assign(userId: number, id: number, body: TAssignTicketBodySchema) {
    const { tenant, ticket } = await this.getStaffTicketOrThrow(userId, id)
    if (tenant.roleId !== roleName.LANDLORD && tenant.roleId !== roleName.MANAGER) {
      throw new NotFoundException('Không tìm thấy ticket trong phạm vi xử lý')
    }
    if (TERMINAL_STATUSES.includes(ticket.status)) {
      throw new BadRequestException('Không thể phân công ticket đã đóng hoặc đã hủy')
    }

    if (body.assignedTo) {
      const member = await this.ticketsRepository.findActiveTenantMember(
        tenant.tenantId,
        body.assignedTo,
        ASSIGNABLE_ROLES,
      )
      if (!member) {
        throw new BadRequestException('Người được phân công không thuộc tenant hoặc không có vai trò xử lý ticket')
      }
    }

    const updated = await this.ticketsRepository.assignTicket({
      tenantId: tenant.tenantId,
      id: ticket.id,
      expectedStatus: ticket.status,
      expectedAssignee: ticket.assignedTo,
      assignedTo: body.assignedTo,
      actorId: userId,
    })
    if (!updated) throw new ConflictException('Ticket đã được cập nhật bởi thao tác khác')
    await this.notificationEventsService.notifyTicketAssigned(updated)
    return this.withRelationCounts(updated)
  }

  async closeMine(userId: number, id: number) {
    const ticket = await this.getMine(userId, id)
    if (ticket.status !== 'RESOLVED') throw new BadRequestException('Chỉ ticket đã xử lý mới được xác nhận đóng')
    const updated = await this.transitionOrConflict({
      tenantId: ticket.tenantId,
      id,
      expectedStatus: 'RESOLVED',
      status: 'CLOSED',
      actorId: userId,
      action: 'RENTER_CLOSE_TICKET',
    })
    await this.notificationEventsService.notifyTicketStatusChanged(updated)
    return this.withRelationCounts(updated)
  }

  async reopenMine(userId: number, id: number) {
    const ticket = await this.getMine(userId, id)
    if (ticket.status !== 'RESOLVED') throw new BadRequestException('Chỉ ticket đã xử lý mới được mở lại')
    const status: TicketStatus = ticket.assignedTo ? 'IN_PROGRESS' : 'OPEN'
    const updated = await this.transitionOrConflict({
      tenantId: ticket.tenantId,
      id,
      expectedStatus: 'RESOLVED',
      status,
      actorId: userId,
      action: 'RENTER_REOPEN_TICKET',
    })
    await this.notificationEventsService.notifyTicketStatusChanged(updated)
    return this.withRelationCounts(updated)
  }

  async cancelMine(userId: number, id: number) {
    const ticket = await this.getMine(userId, id)
    if (ticket.status !== 'OPEN') throw new BadRequestException('Chỉ ticket đang mở mới được hủy')
    const updated = await this.transitionOrConflict({
      tenantId: ticket.tenantId,
      id,
      expectedStatus: 'OPEN',
      status: 'CANCELED',
      actorId: userId,
      action: 'RENTER_CANCEL_TICKET',
    })
    await this.notificationEventsService.notifyTicketStatusChanged(updated)
    return this.withRelationCounts(updated)
  }

  async closeForStaff(userId: number, id: number, body: TCloseTicketBodySchema) {
    const { tenant, ticket } = await this.getStaffTicketOrThrow(userId, id)
    if (tenant.roleId !== roleName.LANDLORD && tenant.roleId !== roleName.MANAGER) {
      throw new NotFoundException('Không tìm thấy ticket trong phạm vi xử lý')
    }
    if (ticket.status !== 'RESOLVED') throw new BadRequestException('Chỉ ticket đã xử lý mới được đóng thay')
    const updated = await this.transitionOrConflict({
      tenantId: tenant.tenantId,
      id,
      expectedStatus: 'RESOLVED',
      status: 'CLOSED',
      actorId: userId,
      action: 'STAFF_CLOSE_TICKET',
      reason: body.reason,
    })
    await this.notificationEventsService.notifyTicketStatusChanged(updated)
    return this.withRelationCounts(updated)
  }

  async listMyHistory(userId: number, id: number, query: TTicketRelationsQuerySchema) {
    await this.getMine(userId, id)
    return this.listHistory(id, query, true)
  }

  async listStaffHistory(userId: number, id: number, query: TTicketRelationsQuerySchema) {
    await this.getStaffTicketOrThrow(userId, id)
    return this.listHistory(id, query, false)
  }

  async addComment(userId: number, roleNameValue: RoleNameType, id: number, body: TCreateTicketCommentBodySchema) {
    const ticket = await this.getVisibleTicketOrThrow(userId, roleNameValue, id)
    const isStaff = roleNameValue !== roleName.TENANT
    if (body.isInternal && !isStaff) {
      throw new ForbiddenException('Khách thuê không thể tạo bình luận nội bộ')
    }

    const comment = await this.ticketsRepository.createComment(
      {
        ticketId: ticket.id,
        userId,
        message: body.message,
        isInternal: isStaff ? body.isInternal : false,
      },
      isStaff ? 'STAFF' : 'RENTER',
      envConfig.TICKET_COMMENT_HARD_CAP,
    )
    await this.notificationEventsService.notifyTicketCommented(ticket, userId, isStaff, comment.isInternal)
    return comment
  }

  async addAttachment(
    userId: number,
    roleNameValue: RoleNameType,
    id: number,
    body: TCreateTicketAttachmentBodySchema,
  ) {
    const ticket = await this.getVisibleTicketOrThrow(userId, roleNameValue, id)
    const isStaff = roleNameValue !== roleName.TENANT
    const attachment = await this.ticketsRepository.createAttachment(
      {
        ticketId: ticket.id,
        userId,
        fileUrl: body.fileUrl,
        fileType: body.fileType,
      },
      isStaff ? 'STAFF' : 'RENTER',
      envConfig.TICKET_ATTACHMENT_HARD_CAP,
    )
    await this.notificationEventsService.notifyTicketAttachmentAdded(ticket, userId, isStaff)
    return attachment
  }

  async uploadAttachment(userId: number, roleNameValue: RoleNameType, id: number, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Thiếu file upload')
    if (file.size > 5 * 1024 * 1024) throw new BadRequestException('Ảnh ticket không được vượt quá 5 MB')
    const allowed = IMAGE_TYPES.get(file.mimetype)
    const extension = extname(file.originalname).toLowerCase()
    if (!allowed || !allowed.extensions.includes(extension))
      throw new BadRequestException('Chỉ hỗ trợ JPEG, PNG hoặc WebP')
    try {
      const metadata = await sharp(file.buffer, { failOn: 'error' }).metadata()
      if (metadata.format !== allowed.format) throw new Error('IMAGE_FORMAT_MISMATCH')
    } catch {
      throw new BadRequestException('File ảnh không hợp lệ hoặc bị hỏng')
    }
    const ticket = await this.getVisibleTicketOrThrow(userId, roleNameValue, id)
    const isStaff = roleNameValue !== roleName.TENANT
    const uploaded = await this.cloudinaryService.uploadImage(file, `tickets/${ticket.tenantId}/${ticket.id}`)
    try {
      const attachment = await this.ticketsRepository.createAttachment(
        {
          ticketId: ticket.id,
          userId,
          fileUrl: uploaded.url,
          fileType: file.mimetype,
          publicId: uploaded.publicId,
        },
        isStaff ? 'STAFF' : 'RENTER',
        envConfig.TICKET_ATTACHMENT_HARD_CAP,
      )
      await this.notificationEventsService.notifyTicketAttachmentAdded(ticket, userId, isStaff)
      return attachment
    } catch (error) {
      try {
        await this.cloudinaryService.deleteImage(uploaded.publicId)
      } catch {
        // Preserve the original database error; orphan cleanup can be retried operationally.
      }
      throw error
    }
  }

  private async getVisibleTicketOrThrow(userId: number, roleNameValue: RoleNameType, id: number) {
    if (roleNameValue === roleName.TENANT) {
      return this.getMine(userId, id)
    }
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const ticket = await this.getTenantTicketOrThrow(tenant.tenantId, id)
    if (tenant.roleId === roleName.MAINTENANCE_STAFF && ticket.assignedTo !== userId) {
      throw new NotFoundException('Không tìm thấy ticket trong phạm vi xử lý')
    }
    return ticket
  }

  private async getStaffTicketOrThrow(userId: number, id: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const ticket = await this.getTenantTicketOrThrow(tenant.tenantId, id)
    if (tenant.roleId === roleName.MAINTENANCE_STAFF && ticket.assignedTo !== userId) {
      throw new NotFoundException('Không tìm thấy ticket trong phạm vi xử lý')
    }
    return { tenant, ticket }
  }

  private async transitionOrConflict(input: Parameters<TicketsRepository['transitionTicket']>[0]) {
    const updated = await this.ticketsRepository.transitionTicket(input)
    if (!updated) throw new ConflictException('Ticket đã được cập nhật bởi thao tác khác')
    return updated
  }

  private async listHistory(id: number, query: TTicketRelationsQuerySchema, renterProjection: boolean) {
    const { page, limit, skip } = normalizePagination(query)
    const [items, total] = await this.ticketsRepository.findTicketHistoryAndCount(id, skip, limit)
    if (renterProjection) {
      const projected = items.map((item) => ({
        id: item.id,
        action: item.action,
        transition: {
          oldValues: this.publicHistoryValues(item.oldValues),
          newValues: this.publicHistoryValues(item.newValues),
        },
        actorDisplayName: item.actor?.fullName ?? 'Hệ thống',
        createdAt: item.createdAt,
      }))
      return buildPaginatedResult(projected, total, page, limit)
    }
    return buildPaginatedResult(items, total, page, limit)
  }

  private publicHistoryValues(value: Prisma.JsonValue | null) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const source = value as Record<string, Prisma.JsonValue>
    return {
      ...(typeof source.status === 'string' ? { status: source.status } : {}),
      ...(typeof source.assignedTo === 'number' || source.assignedTo === null ? { assignedTo: source.assignedTo } : {}),
    }
  }

  private async getTenantTicketOrThrow(tenantId: number, id: number) {
    const ticket = await this.ticketsRepository.findTenantTicket(tenantId, id)
    if (!ticket) {
      throw new NotFoundException('Không tìm thấy ticket trong tenant hiện tại')
    }
    return ticket
  }

  private buildTicketWhere(query: TListTicketsQuerySchema, base: Prisma.TicketWhereInput): Prisma.TicketWhereInput {
    const filters: Prisma.TicketWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.roomId ? { roomId: query.roomId } : {}),
      ...(query.contractId ? { contractId: query.contractId } : {}),
      ...(query.assignedTo ? { assignedTo: query.assignedTo } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { room: { roomCode: { contains: query.search, mode: 'insensitive' } } },
              { createdBy: { fullName: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }

    return { AND: [base, filters] }
  }

  private withRelationCounts<T extends { _count?: { comments: number; attachments: number } }>(ticket: T) {
    const { _count, ...data } = ticket
    return {
      ...data,
      commentCount: _count?.comments ?? 0,
      attachmentCount: _count?.attachments ?? 0,
    }
  }
}
