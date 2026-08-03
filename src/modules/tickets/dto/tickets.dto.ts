import { createZodDto } from 'nestjs-zod'
import {
  AssignTicketBodySchema,
  CloseTicketBodySchema,
  CreateTicketAttachmentBodySchema,
  CreateTicketBodySchema,
  CreateTicketCommentBodySchema,
  ListTicketsQuerySchema,
  TicketRelationsQuerySchema,
  UpdateTicketStatusBodySchema,
} from '../model/tickets.model'

export class CreateTicketBodyDTO extends createZodDto(CreateTicketBodySchema) {}
export class ListTicketsQueryDTO extends createZodDto(ListTicketsQuerySchema) {}
export class TicketRelationsQueryDTO extends createZodDto(TicketRelationsQuerySchema) {}
export class UpdateTicketStatusBodyDTO extends createZodDto(UpdateTicketStatusBodySchema) {}
export class AssignTicketBodyDTO extends createZodDto(AssignTicketBodySchema) {}
export class CreateTicketCommentBodyDTO extends createZodDto(CreateTicketCommentBodySchema) {}
export class CreateTicketAttachmentBodyDTO extends createZodDto(CreateTicketAttachmentBodySchema) {}
export class CloseTicketBodyDTO extends createZodDto(CloseTicketBodySchema) {}
