import { BooleanInputCodec } from '@src/common/utils/boolean-codec.util'
import z from 'zod'

const TicketCategorySchema = z.enum(['ELECTRICITY', 'WATER', 'INTERNET', 'FURNITURE', 'SECURITY', 'CLEANING', 'OTHER'])
const TicketPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
const TicketStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_RENTER', 'RESOLVED', 'CLOSED', 'CANCELED'])

export const TicketAttachmentInputSchema = z
  .object({
    fileUrl: z.string().trim().min(1).max(5000),
    fileType: z.string().trim().min(1).max(50),
  })
  .strict()

export const CreateTicketBodySchema = z
  .object({
    roomId: z.coerce.number().int().positive(),
    contractId: z.coerce.number().int().positive().optional(),
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().min(1).max(5000),
    category: TicketCategorySchema,
    priority: TicketPrioritySchema.default('MEDIUM'),
    attachments: z.array(TicketAttachmentInputSchema).max(10).default([]),
  })
  .strict()

export const ListTicketsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: TicketStatusSchema.optional(),
    category: TicketCategorySchema.optional(),
    priority: TicketPrioritySchema.optional(),
    roomId: z.coerce.number().int().positive().optional(),
    contractId: z.coerce.number().int().positive().optional(),
    assignedTo: z.coerce.number().int().positive().optional(),
    search: z.string().trim().optional(),
  })
  .strict()

export const TicketRelationsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(20),
  })
  .strict()

export const UpdateTicketStatusBodySchema = z
  .object({
    status: TicketStatusSchema,
  })
  .strict()

export const AssignTicketBodySchema = z
  .object({
    assignedTo: z.coerce.number().int().positive().nullable(),
    scheduledAt: z.string().datetime().transform(val => new Date(val)).optional(),
    scheduledNote: z.string().trim().max(500).optional(),
  })
  .strict()

export const CreateTicketCommentBodySchema = z
  .object({
    message: z.string().trim().min(1).max(5000),
    isInternal: BooleanInputCodec.default(false),
  })
  .strict()

export const CreateTicketAttachmentBodySchema = TicketAttachmentInputSchema

export const CloseTicketBodySchema = z
  .object({
    reason: z.string().trim().min(1).max(1000),
  })
  .strict()

export const EmptyTicketActionBodySchema = z.object({}).strict()

export type TCreateTicketBodySchema = z.infer<typeof CreateTicketBodySchema>
export type TListTicketsQuerySchema = z.infer<typeof ListTicketsQuerySchema>
export type TTicketRelationsQuerySchema = z.infer<typeof TicketRelationsQuerySchema>
export type TUpdateTicketStatusBodySchema = z.infer<typeof UpdateTicketStatusBodySchema>
export type TAssignTicketBodySchema = z.infer<typeof AssignTicketBodySchema>
export type TCreateTicketCommentBodySchema = z.infer<typeof CreateTicketCommentBodySchema>
export type TCreateTicketAttachmentBodySchema = z.infer<typeof CreateTicketAttachmentBodySchema>
export type TCloseTicketBodySchema = z.infer<typeof CloseTicketBodySchema>
