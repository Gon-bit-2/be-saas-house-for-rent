import z from 'zod'
import { IsoDateInputCodec } from '@src/common/utils/date-codec.util'

export const BillingCycleSchema = z.enum(['MONTHLY', 'YEARLY'])
export const SubscriptionPaymentStatusSchema = z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELED', 'EXPIRED'])
export const SubscriptionPaymentPurposeSchema = z.enum(['RENEWAL', 'PLAN_CHANGE'])

export const CreateSubscriptionCheckoutBodySchema = z
  .object({
    planId: z.coerce.number().int().positive(),
    billingCycle: BillingCycleSchema,
  })
  .strict()

const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const ListMySubscriptionPaymentsQuerySchema = PaginationSchema.extend({
  status: SubscriptionPaymentStatusSchema.optional(),
  purpose: SubscriptionPaymentPurposeSchema.optional(),
  from: IsoDateInputCodec.optional(),
  to: IsoDateInputCodec.optional(),
})
  .strict()
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: 'from phải nhỏ hơn hoặc bằng to',
    path: ['to'],
  })

export const ListSubscriptionPaymentsQuerySchema = PaginationSchema.extend({
  tenantId: z.coerce.number().int().positive().optional(),
  subscriptionId: z.coerce.number().int().positive().optional(),
  planId: z.coerce.number().int().positive().optional(),
  status: SubscriptionPaymentStatusSchema.optional(),
  purpose: SubscriptionPaymentPurposeSchema.optional(),
  from: IsoDateInputCodec.optional(),
  to: IsoDateInputCodec.optional(),
  search: z.string().trim().min(1).max(100).optional(),
})
  .strict()
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: 'from phải nhỏ hơn hoặc bằng to',
    path: ['to'],
  })

export type TCreateSubscriptionCheckoutBodySchema = z.infer<typeof CreateSubscriptionCheckoutBodySchema>
export type TListMySubscriptionPaymentsQuerySchema = z.infer<typeof ListMySubscriptionPaymentsQuerySchema>
export type TListSubscriptionPaymentsQuerySchema = z.infer<typeof ListSubscriptionPaymentsQuerySchema>
