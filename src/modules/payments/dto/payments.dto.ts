import { createZodDto } from 'nestjs-zod'
import {
  CreatePaymentQrBodySchema,
  ListPaymentsQuerySchema,
  PayosWebhookRequestSchema,
  ReviewPaymentBodySchema,
  SubmitPaymentConfirmationBodySchema,
  RecordManualPaymentBodySchema,
} from '../model/payments.model'

export class ListPaymentsQueryDTO extends createZodDto(ListPaymentsQuerySchema) {}
export class CreatePaymentQrBodyDTO extends createZodDto(CreatePaymentQrBodySchema) {}
export class SubmitPaymentConfirmationBodyDTO extends createZodDto(SubmitPaymentConfirmationBodySchema) {}
export class ReviewPaymentBodyDTO extends createZodDto(ReviewPaymentBodySchema) {}
export class RecordManualPaymentBodyDTO extends createZodDto(RecordManualPaymentBodySchema) {}
export class PayosWebhookBodyDTO extends createZodDto(PayosWebhookRequestSchema) {}
