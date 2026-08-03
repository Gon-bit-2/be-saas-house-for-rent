import { Injectable } from '@nestjs/common'
import { PayOS, type CreatePaymentLinkRequest } from '@payos/node'
import envConfig from '@src/config/env.config'
import type { TPayosWebhookBodySchema } from '../payments/model/payments.model'

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

  getPaymentLink(paymentLinkId: string) {
    return this.payos.paymentRequests.get(paymentLinkId)
  }

  cancelPaymentLink(paymentLinkId: string, reason?: string) {
    return this.payos.paymentRequests.cancel(paymentLinkId, reason)
  }

  verifyWebhook(payload: TPayosWebhookBodySchema) {
    return this.payos.webhooks.verify(payload)
  }
}
