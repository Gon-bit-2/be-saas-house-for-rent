import { createZodDto } from 'nestjs-zod'
import {
  CreatePaymentQrBodySchema,
  ListPaymentsQuerySchema,
  PayosWebhookBodySchema,
  ReviewPaymentBodySchema,
  SubmitPaymentConfirmationBodySchema,
} from '../model/payments.model'

export class ListPaymentsQueryDTO extends createZodDto(ListPaymentsQuerySchema) {}
export class CreatePaymentQrBodyDTO extends createZodDto(CreatePaymentQrBodySchema) {}
export class SubmitPaymentConfirmationBodyDTO extends createZodDto(SubmitPaymentConfirmationBodySchema) {}
export class ReviewPaymentBodyDTO extends createZodDto(ReviewPaymentBodySchema) {}
export class PayosWebhookBodyDTO extends createZodDto(PayosWebhookBodySchema) {}
