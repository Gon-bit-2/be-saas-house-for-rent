import z from 'zod'

const InvoiceStatusSchema = z.enum(['DRAFT', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELED'])
const CreatableInvoiceStatusSchema = z.enum(['DRAFT', 'UNPAID'])
const DebtStatusSchema = z.enum(['OPEN', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELED'])
const ExtraInvoiceItemTypeSchema = z.enum(['SERVICE', 'PARKING', 'INTERNET', 'PENALTY', 'DISCOUNT', 'OTHER'])

const ListBaseSchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    billingMonth: z.coerce.date().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    roomId: z.coerce.number().int().positive().optional(),
    contractId: z.coerce.number().int().positive().optional(),
    renterId: z.coerce.number().int().positive().optional(),
    propertyId: z.coerce.number().int().positive().optional(),
    search: z.string().trim().min(1).optional(),
  })
  .strict()

export const ExtraInvoiceItemSchema = z
  .object({
    itemType: ExtraInvoiceItemTypeSchema,
    description: z.string().trim().min(1).max(1000),
    quantity: z.coerce.number().nonnegative(),
    unitPrice: z.coerce.number().nonnegative(),
  })
  .strict()

export const ListInvoicesQuerySchema = ListBaseSchema.extend({
  status: InvoiceStatusSchema.optional(),
})

export const ListDebtsQuerySchema = ListBaseSchema.extend({
  status: DebtStatusSchema.optional(),
})

export const CreateInvoiceBodySchema = z
  .object({
    contractId: z.coerce.number().int().positive(),
    billingMonth: z.coerce.date(),
    issueDate: z.coerce.date().optional(),
    dueDate: z.coerce.date().optional(),
    note: z.string().trim().max(5000).nullable().optional(),
    status: CreatableInvoiceStatusSchema.default('DRAFT'),
    extraItems: z.array(ExtraInvoiceItemSchema).max(100).default([]),
  })
  .strict()

export const UpdateInvoiceBodySchema = z
  .object({
    issueDate: z.coerce.date().optional(),
    dueDate: z.coerce.date().optional(),
    note: z.string().trim().max(5000).nullable().optional(),
    extraItems: z.array(ExtraInvoiceItemSchema).max(100).optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: 'Cần cung cấp ít nhất một trường để cập nhật' })

export const EmptyInvoiceActionBodySchema = z.object({}).strict()

export type TExtraInvoiceItemSchema = z.infer<typeof ExtraInvoiceItemSchema>
export type TListInvoicesQuerySchema = z.infer<typeof ListInvoicesQuerySchema>
export type TListDebtsQuerySchema = z.infer<typeof ListDebtsQuerySchema>
export type TCreateInvoiceBodySchema = z.infer<typeof CreateInvoiceBodySchema>
export type TUpdateInvoiceBodySchema = z.infer<typeof UpdateInvoiceBodySchema>
export type TEmptyInvoiceActionBodySchema = z.infer<typeof EmptyInvoiceActionBodySchema>
