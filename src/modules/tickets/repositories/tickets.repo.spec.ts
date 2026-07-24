jest.mock('@src/shared/modules/database/prisma.service', () => ({ PrismaService: class PrismaService {} }))

import { ConflictException } from '@nestjs/common'

import {
  renterTicketAttachmentSelect,
  renterTicketCommentSelect,
  renterTicketDetailSelect,
  renterTicketSummarySelect,
  staffTicketCommentSelect,
  staffTicketDetailSelect,
  staffTicketSummarySelect,
  TicketsRepository,
} from './tickets.repo'

describe('TicketsRepository projections', () => {
  it('filters internal comments and staff PII from renter responses at query time', () => {
    expect(renterTicketSummarySelect).not.toHaveProperty('comments')
    expect(renterTicketSummarySelect).not.toHaveProperty('attachments')
    expect(renterTicketSummarySelect._count.select.comments).toEqual({ where: { isInternal: false } })
    expect(renterTicketCommentSelect.user.select).toEqual({ id: true, fullName: true })
    expect(renterTicketAttachmentSelect.uploadedByUser.select).toEqual({ id: true, fullName: true })
    expect(renterTicketDetailSelect.assignedToUser.select).toEqual({ id: true, fullName: true })
    expect(renterTicketDetailSelect).not.toHaveProperty('comments')
    expect(renterTicketDetailSelect).not.toHaveProperty('attachments')
  })

  it('retains internal comments for staff responses', () => {
    expect(staffTicketSummarySelect._count.select.comments).toBe(true)
    expect(staffTicketCommentSelect).toHaveProperty('isInternal', true)
    expect(staffTicketDetailSelect).not.toHaveProperty('comments')
  })
})

describe('TicketsRepository hard caps', () => {
  it('locks the ticket and rejects a comment at the configured cap', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 11 }]),
      ticketComment: {
        count: jest.fn().mockResolvedValue(500),
        create: jest.fn(),
      },
    }
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    }
    const repository = new TicketsRepository(prisma as never)

    await expect(
      repository.createComment({ ticketId: 11, userId: 50, message: 'Comment', isInternal: false }, 'RENTER', 500),
    ).rejects.toBeInstanceOf(ConflictException)

    expect(tx.$queryRaw).toHaveBeenCalled()
    expect(tx.ticketComment.create).not.toHaveBeenCalled()
  })
})
