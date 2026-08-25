import { ConflictException, Injectable } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import type { Prisma, TicketStatus } from 'generated/prisma/client'

export const staffTicketAttachmentSelect = {
  id: true,
  ticketId: true,
  fileUrl: true,
  fileType: true,
  uploadedBy: true,
  createdAt: true,
  uploadedByUser: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.TicketAttachmentSelect

export const renterTicketAttachmentSelect = {
  id: true,
  ticketId: true,
  fileUrl: true,
  fileType: true,
  uploadedBy: true,
  createdAt: true,
  uploadedByUser: { select: { id: true, fullName: true } },
} satisfies Prisma.TicketAttachmentSelect

export const staffTicketCommentSelect = {
  id: true,
  ticketId: true,
  userId: true,
  message: true,
  isInternal: true,
  createdAt: true,
  user: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.TicketCommentSelect

export const renterTicketCommentSelect = {
  id: true,
  ticketId: true,
  userId: true,
  message: true,
  isInternal: true,
  createdAt: true,
  user: { select: { id: true, fullName: true } },
} satisfies Prisma.TicketCommentSelect

const staffTicketBaseSelect = {
  id: true,
  tenantId: true,
  roomId: true,
  contractId: true,
  assignedTo: true,
  title: true,
  category: true,
  priority: true,
  status: true,
  createdAt: true,
  resolvedAt: true,
  createdById: true,
  updatedById: true,
  scheduledAt: true,
  scheduledNote: true,
  room: { select: { id: true, roomCode: true, title: true, property: { select: { id: true, name: true } } } },
  contract: { select: { id: true, contractCode: true, status: true, renterId: true } },
  assignedToUser: { select: { id: true, fullName: true, email: true, phone: true } },
  createdBy: { select: { id: true, fullName: true, email: true, phone: true } },
} satisfies Prisma.TicketSelect

const renterTicketBaseSelect = {
  id: true,
  tenantId: true,
  roomId: true,
  contractId: true,
  assignedTo: true,
  title: true,
  category: true,
  priority: true,
  status: true,
  createdAt: true,
  resolvedAt: true,
  createdById: true,
  updatedById: true,
  scheduledAt: true,
  scheduledNote: true,
  room: { select: { id: true, roomCode: true, title: true, property: { select: { id: true, name: true } } } },
  contract: { select: { id: true, contractCode: true, status: true, renterId: true } },
  assignedToUser: { select: { id: true, fullName: true } },
  createdBy: { select: { id: true, fullName: true } },
} satisfies Prisma.TicketSelect

export const staffTicketSummarySelect = {
  ...staffTicketBaseSelect,
  _count: { select: { comments: true, attachments: true } },
} satisfies Prisma.TicketSelect

export const renterTicketSummarySelect = {
  ...renterTicketBaseSelect,
  _count: { select: { comments: { where: { isInternal: false } }, attachments: true } },
} satisfies Prisma.TicketSelect

export const staffTicketDetailSelect = {
  ...staffTicketBaseSelect,
  description: true,
  _count: { select: { comments: true, attachments: true } },
} satisfies Prisma.TicketSelect

export const renterTicketDetailSelect = {
  ...renterTicketBaseSelect,
  description: true,
  _count: { select: { comments: { where: { isInternal: false } }, attachments: true } },
} satisfies Prisma.TicketSelect

@Injectable()
export class TicketsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findStaffTicketsAndCount(where: Prisma.TicketWhereInput, skip: number, take: number) {
    return this.prismaService.$transaction([
      this.prismaService.ticket.findMany({
        where,
        skip,
        take,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        select: staffTicketSummarySelect,
      }),
      this.prismaService.ticket.count({ where }),
    ])
  }

  async findRenterTicketsAndCount(where: Prisma.TicketWhereInput, skip: number, take: number) {
    return this.prismaService.$transaction([
      this.prismaService.ticket.findMany({
        where,
        skip,
        take,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        select: renterTicketSummarySelect,
      }),
      this.prismaService.ticket.count({ where }),
    ])
  }

  async findActiveRenterContractForRoom(userId: number, roomId: number, contractId?: number) {
    return this.prismaService.contract.findFirst({
      where: {
        ...(contractId ? { id: contractId } : {}),
        roomId,
        status: 'ACTIVE',
        deletedAt: null,
        OR: [{ renterId: userId }, { members: { some: { userId } } }],
        room: { deletedAt: null, property: { deletedAt: null, status: 'ACTIVE' } },
        tenant: { deletedAt: null, status: 'ACTIVE' },
      },
      orderBy: { startDate: 'desc' },
      select: { id: true, tenantId: true, roomId: true, renterId: true },
    })
  }

  async createTicket(input: {
    tenantId: number
    roomId: number
    contractId: number
    title: string
    description: string
    category: Prisma.TicketCreateInput['category']
    priority: Prisma.TicketCreateInput['priority']
    createdById: number
    attachments: Array<{ fileUrl: string; fileType: string }>
  }) {
    return this.prismaService.$transaction(async (tx) => {
      const ticket = await tx.ticket.create({
        data: {
          tenantId: input.tenantId,
          roomId: input.roomId,
          contractId: input.contractId,
          title: input.title,
          description: input.description,
          category: input.category,
          priority: input.priority,
          status: 'OPEN',
          createdById: input.createdById,
          updatedById: input.createdById,
        },
        select: { id: true },
      })

      if (input.attachments.length > 0) {
        await tx.ticketAttachment.createMany({
          data: input.attachments.map((attachment) => ({
            ticketId: ticket.id,
            fileUrl: attachment.fileUrl,
            fileType: attachment.fileType,
            uploadedBy: input.createdById,
          })),
        })
      }

      return tx.ticket.findUniqueOrThrow({ where: { id: ticket.id }, select: renterTicketDetailSelect })
    })
  }

  async findTenantTicket(tenantId: number, id: number) {
    return this.prismaService.ticket.findFirst({ where: { id, tenantId }, select: staffTicketDetailSelect })
  }

  async findUserTicket(userId: number, id: number) {
    return this.prismaService.ticket.findFirst({
      where: {
        id,
        OR: [{ createdById: userId }, { contract: { OR: [{ renterId: userId }, { members: { some: { userId } } }] } }],
      },
      select: renterTicketDetailSelect,
    })
  }

  async updateTicket(id: number, data: Prisma.TicketUncheckedUpdateInput) {
    return this.prismaService.ticket.update({ where: { id }, data, select: staffTicketDetailSelect })
  }

  async transitionTicket(input: {
    tenantId: number
    id: number
    expectedStatus: TicketStatus
    status: TicketStatus
    actorId: number
    action: string
    reason?: string
  }) {
    return this.prismaService.$transaction(async (tx) => {
      const result = await tx.ticket.updateMany({
        where: { id: input.id, tenantId: input.tenantId, status: input.expectedStatus },
        data: {
          status: input.status,
          resolvedAt: ['RESOLVED', 'CLOSED'].includes(input.status) ? new Date() : null,
          updatedById: input.actorId,
        },
      })
      if (result.count !== 1) return null

      // Đoạn đồng bộ trạng thái Room đã bị loại bỏ theo thiết kế mới

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorId,
          action: input.action,
          entityType: 'TICKET',
          entityId: String(input.id),
          oldValues: { status: input.expectedStatus },
          newValues: { status: input.status, reason: input.reason ?? null },
        },
      })
      return tx.ticket.findUniqueOrThrow({ where: { id: input.id }, select: staffTicketDetailSelect })
    })
  }

  async assignTicket(input: {
    tenantId: number
    id: number
    expectedStatus: TicketStatus
    expectedAssignee: number | null
    assignedTo: number | null
    scheduledAt?: Date | null
    scheduledNote?: string | null
    actorId: number
  }) {
    const status: TicketStatus =
      input.expectedStatus === 'OPEN' && input.assignedTo ? 'IN_PROGRESS' : input.expectedStatus
    return this.prismaService.$transaction(async (tx) => {
      const result = await tx.ticket.updateMany({
        where: {
          id: input.id,
          tenantId: input.tenantId,
          status: input.expectedStatus,
          assignedTo: input.expectedAssignee,
        },
        data: { 
          assignedTo: input.assignedTo, 
          status, 
          scheduledAt: input.scheduledAt,
          scheduledNote: input.scheduledNote,
          updatedById: input.actorId 
        },
      })
      if (result.count !== 1) return null

      // Đoạn đồng bộ trạng thái Room đã bị loại bỏ theo thiết kế mới

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorId,
          action: 'ASSIGN_TICKET',
          entityType: 'TICKET',
          entityId: String(input.id),
          oldValues: { status: input.expectedStatus, assignedTo: input.expectedAssignee },
          newValues: { status, assignedTo: input.assignedTo },
        },
      })
      return tx.ticket.findUniqueOrThrow({ where: { id: input.id }, select: staffTicketDetailSelect })
    })
  }

  async findTicketHistoryAndCount(ticketId: number, skip: number, take: number) {
    const where: Prisma.AuditLogWhereInput = { entityType: 'TICKET', entityId: String(ticketId) }
    return this.prismaService.$transaction([
      this.prismaService.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          action: true,
          oldValues: true,
          newValues: true,
          createdAt: true,
          actor: { select: { id: true, fullName: true } },
        },
      }),
      this.prismaService.auditLog.count({ where }),
    ])
  }

  async findStaffCommentsAndCount(ticketId: number, skip: number, take: number) {
    const where: Prisma.TicketCommentWhereInput = { ticketId }
    return this.prismaService.$transaction([
      this.prismaService.ticketComment.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: staffTicketCommentSelect,
      }),
      this.prismaService.ticketComment.count({ where }),
    ])
  }

  async findRenterCommentsAndCount(ticketId: number, skip: number, take: number) {
    const where: Prisma.TicketCommentWhereInput = { ticketId, isInternal: false }
    return this.prismaService.$transaction([
      this.prismaService.ticketComment.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: renterTicketCommentSelect,
      }),
      this.prismaService.ticketComment.count({ where }),
    ])
  }

  async findStaffAttachmentsAndCount(ticketId: number, skip: number, take: number) {
    const where: Prisma.TicketAttachmentWhereInput = { ticketId }
    return this.prismaService.$transaction([
      this.prismaService.ticketAttachment.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: staffTicketAttachmentSelect,
      }),
      this.prismaService.ticketAttachment.count({ where }),
    ])
  }

  async findRenterAttachmentsAndCount(ticketId: number, skip: number, take: number) {
    const where: Prisma.TicketAttachmentWhereInput = { ticketId }
    return this.prismaService.$transaction([
      this.prismaService.ticketAttachment.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: renterTicketAttachmentSelect,
      }),
      this.prismaService.ticketAttachment.count({ where }),
    ])
  }

  async createComment(
    input: { ticketId: number; userId: number; message: string; isInternal: boolean },
    audience: 'RENTER' | 'STAFF',
    hardCap: number,
  ) {
    return this.prismaService.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM tickets WHERE id = ${input.ticketId} FOR UPDATE`
      const count = await tx.ticketComment.count({ where: { ticketId: input.ticketId } })
      if (count >= hardCap) {
        throw new ConflictException('TICKET_RELATION_LIMIT_REACHED')
      }
      return tx.ticketComment.create({
        data: input,
        select: audience === 'RENTER' ? renterTicketCommentSelect : staffTicketCommentSelect,
      })
    })
  }

  async createAttachment(
    input: { ticketId: number; userId: number; fileUrl: string; fileType: string; publicId?: string | null },
    audience: 'RENTER' | 'STAFF',
    hardCap: number,
  ) {
    return this.prismaService.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM tickets WHERE id = ${input.ticketId} FOR UPDATE`
      const count = await tx.ticketAttachment.count({ where: { ticketId: input.ticketId } })
      if (count >= hardCap) {
        throw new ConflictException('TICKET_RELATION_LIMIT_REACHED')
      }
      return tx.ticketAttachment.create({
        data: {
          ticketId: input.ticketId,
          fileUrl: input.fileUrl,
          fileType: input.fileType,
          uploadedBy: input.userId,
          publicId: input.publicId ?? null,
        },
        select: audience === 'RENTER' ? renterTicketAttachmentSelect : staffTicketAttachmentSelect,
      })
    })
  }

  async findActiveTenantMember(tenantId: number, userId: number, roleIds: string[]) {
    return this.prismaService.tenantMember.findFirst({
      where: { tenantId, userId, status: 'ACTIVE', roleId: { in: roleIds } },
      select: { id: true, userId: true, roleId: true },
    })
  }
}
