import z from 'zod'
import { IsoDateInputCodec } from '@src/common/utils/date-codec.util'

const PaymentStatusSchema = z.enum(['PENDING', 'SUCCESS', 'FAILED', 'CANCELED', 'REFUNDED'])
const PaymentMethodSchema = z.enum(['BANK_TRANSFER', 'QR', 'CASH', 'WALLET'])

export const ListPaymentsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: PaymentStatusSchema.optional(),
    method: PaymentMethodSchema.optional(),
    invoiceId: z.coerce.number().int().positive().optional(),
    renterId: z.coerce.number().int().positive().optional(),
    from: IsoDateInputCodec.optional(),
    to: IsoDateInputCodec.optional(),
    search: z.string().trim().optional(),
  })
  .strict()

export const CreatePaymentQrBodySchema = z.object({}).strict()

export const SubmitPaymentConfirmationBodySchema = z
  .object({
    amount: z.coerce.number().positive(),
    transactionCode: z.string().trim().min(1).max(100).optional(),
    evidenceUrl: z.string().trim().min(1).max(5000).optional(),
    renterNote: z.string().trim().min(1).max(5000).optional(),
    paidAt: IsoDateInputCodec.optional(),
  })
  .strict()

export const ReviewPaymentBodySchema = z
  .object({
    landlordNote: z.string().trim().min(1).max(5000).optional(),
  })
  .strict()

const PayosWebhookDataSchema = z.object({
  orderCode: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive(),
  description: z.string(),
  accountNumber: z.string(),
  reference: z.string(),
  transactionDateTime: z.string(),
  currency: z.string(),
  paymentLinkId: z.string(),
  code: z.string(),
  desc: z.string(),
  counterAccountBankId: z.string().nullable().optional(),
  counterAccountBankName: z.string().nullable().optional(),
  counterAccountName: z.string().nullable().optional(),
  counterAccountNumber: z.string().nullable().optional(),
  virtualAccountName: z.string().nullable().optional(),
  virtualAccountNumber: z.string().nullable().optional(),
})

export const PayosWebhookBodySchema = z.object({
  code: z.string(),
  desc: z.string(),
  success: z.boolean(),
  data: PayosWebhookDataSchema,
  signature: z.string(),
})

export type TListPaymentsQuerySchema = z.infer<typeof ListPaymentsQuerySchema>
export type TCreatePaymentQrBodySchema = z.infer<typeof CreatePaymentQrBodySchema>
export type TSubmitPaymentConfirmationBodySchema = z.infer<typeof SubmitPaymentConfirmationBodySchema>
export type TReviewPaymentBodySchema = z.infer<typeof ReviewPaymentBodySchema>
export type TPayosWebhookBodySchema = z.infer<typeof PayosWebhookBodySchema>
export type TPayosWebhookDataSchema = z.infer<typeof PayosWebhookDataSchema>
