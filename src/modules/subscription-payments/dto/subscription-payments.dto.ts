import { createZodDto } from 'nestjs-zod'
import {
  CreateSubscriptionCheckoutBodySchema,
  ListMySubscriptionPaymentsQuerySchema,
  ListSubscriptionPaymentsQuerySchema,
} from '../model/subscription-payments.model'

export class CreateSubscriptionCheckoutBodyDTO extends createZodDto(CreateSubscriptionCheckoutBodySchema) {}
export class ListMySubscriptionPaymentsQueryDTO extends createZodDto(ListMySubscriptionPaymentsQuerySchema) {}
export class ListSubscriptionPaymentsQueryDTO extends createZodDto(ListSubscriptionPaymentsQuerySchema) {}
