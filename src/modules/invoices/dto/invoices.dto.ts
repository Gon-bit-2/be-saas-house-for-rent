import { createZodDto } from 'nestjs-zod'
import {
  CreateInvoiceBodySchema,
  EmptyInvoiceActionBodySchema,
  ListDebtsQuerySchema,
  ListInvoicesQuerySchema,
  UpdateInvoiceBodySchema,
} from '../model/invoices.model'

export class ListInvoicesQueryDTO extends createZodDto(ListInvoicesQuerySchema) {}
export class ListDebtsQueryDTO extends createZodDto(ListDebtsQuerySchema) {}
export class CreateInvoiceBodyDTO extends createZodDto(CreateInvoiceBodySchema) {}
export class UpdateInvoiceBodyDTO extends createZodDto(UpdateInvoiceBodySchema) {}
export class EmptyInvoiceActionBodyDTO extends createZodDto(EmptyInvoiceActionBodySchema) {}
