import { Injectable } from '@nestjs/common'
import { PayOS, type CreatePaymentLinkRequest, type Webhook } from '@payos/node'
import envConfig from '@src/config/env.config'
import type { TPayosWebhookBodySchema } from './model/payments.model'

@Injectable()
export class PayosService {
  private readonly payos = new PayOS({
    clientId: envConfig.PAYOS_CLIENT_ID,
    apiKey: envConfig.PAYOS_API_KEY,
    checksumKey: envConfig.PAYOS_CHECKSUM_KEY,
  })

  createPaymentLink(data: CreatePaymentLinkRequest) {
    return this.payos.paymentRequests.create(data)
  }

  verifyWebhook(payload: TPayosWebhookBodySchema) {
    return this.payos.webhooks.verify(payload as Webhook)
  }
}