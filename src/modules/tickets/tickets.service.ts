import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import roleName, { RoleNameType } from '@src/common/constants/role.constant'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import envConfig from '@src/config/env.config'
import { NotificationEventsService } from '@src/modules/notifications/notification-events.service'
import { TenantAccessService } from '@src/shared/modules/services/tenant-access.service'
import type { Prisma, TicketStatus } from 'generated/prisma/client'
import type {
  TAssignTicketBodySchema,
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

@Injectable()
export class TicketsService {
  constructor(
    private readonly ticketsRepository: TicketsRepository,
    private readonly tenantAccessService: TenantAccessService,
    private readonly notificationEventsService: NotificationEventsService,
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
    const where = this.buildTicketWhere(query, { tenantId: tenant.tenantId })
    const [tickets, total] = await this.ticketsRepository.findStaffTicketsAndCount(where, skip, limit)
    return buildPaginatedResult(
      tickets.map((ticket) => this.withRelationCounts(ticket)),
      total,
      page,
      limit,
    )
  }

  async getForLandlord(userId: number, id: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    return this.withRelationCounts(await this.getTenantTicketOrThrow(tenant.tenantId, id))
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
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const ticket = await this.getTenantTicketOrThrow(tenant.tenantId, id)
    const { page, limit, skip } = normalizePagination(query)
    const [comments, total] = await this.ticketsRepository.findStaffCommentsAndCount(ticket.id, skip, limit)
    return buildPaginatedResult(comments, total, page, limit)
  }

  async listStaffAttachments(userId: number, id: number, query: TTicketRelationsQuerySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const ticket = await this.getTenantTicketOrThrow(tenant.tenantId, id)
    const { page, limit, skip } = normalizePagination(query)
    const [attachments, total] = await this.ticketsRepository.findStaffAttachmentsAndCount(ticket.id, skip, limit)
    return buildPaginatedResult(attachments, total, page, limit)
  }

  async updateStatus(userId: number, id: number, body: TUpdateTicketStatusBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const ticket = await this.getTenantTicketOrThrow(tenant.tenantId, id)
    if (TERMINAL_STATUSES.includes(ticket.status) && ticket.status !== body.status) {
      throw new BadRequestException('Ticket đã đóng hoặc đã hủy không thể chuyển trạng thái khác')
    }

    const updated = await this.ticketsRepository.updateTicket(id, {
      status: body.status,
      resolvedAt: ['RESOLVED', 'CLOSED'].includes(body.status) ? new Date() : null,
      updatedById: userId,
    })
    await this.notificationEventsService.notifyTicketUpdated(updated)
    return this.withRelationCounts(updated)
  }

  async assign(userId: number, id: number, body: TAssignTicketBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const ticket = await this.getTenantTicketOrThrow(tenant.tenantId, id)
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

    const updated = await this.ticketsRepository.updateTicket(ticket.id, {
      assignedTo: body.assignedTo,
      status: ticket.status === 'OPEN' && body.assignedTo ? 'IN_PROGRESS' : ticket.status,
      updatedById: userId,
    })
    await this.notificationEventsService.notifyTicketUpdated(updated)
    return this.withRelationCounts(updated)
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
    await this.notificationEventsService.notifyTicketUpdated(ticket)
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
    await this.notificationEventsService.notifyTicketUpdated(ticket)
    return attachment
  }

  private async getVisibleTicketOrThrow(userId: number, roleNameValue: RoleNameType, id: number) {
    if (roleNameValue === roleName.TENANT) {
      return this.getMine(userId, id)
    }
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    return this.getTenantTicketOrThrow(tenant.tenantId, id)
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
