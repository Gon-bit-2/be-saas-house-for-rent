import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Injectable, Logger } from '@nestjs/common'
import envConfig from '@src/config/env.config'
import type { Job } from 'bullmq'
import { PAYMENT_WEBHOOK_RETENTION_JOB, PAYMENTS_MAINTENANCE_QUEUE } from './payments-maintenance.constants'
import { PaymentsRepository } from './repositories/payments.repo'

@Injectable()
@Processor(PAYMENTS_MAINTENANCE_QUEUE)
export class PaymentsMaintenanceProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentsMaintenanceProcessor.name)

  constructor(private readonly paymentsRepository: PaymentsRepository) {
    super()
  }

  async process(job: Job) {
    if (job.name !== PAYMENT_WEBHOOK_RETENTION_JOB) return

    const cutoff = new Date(Date.now() - envConfig.PAYMENT_WEBHOOK_RETENTION_DAYS * 24 * 60 * 60_000)
    let deleted = 0
    let batchCount: number
    do {
      batchCount = await this.paymentsRepository.deleteWebhookLogsBefore(
        cutoff,
        envConfig.PAYMENT_WEBHOOK_RETENTION_BATCH_SIZE,
      )
      deleted += batchCount
    } while (batchCount === envConfig.PAYMENT_WEBHOOK_RETENTION_BATCH_SIZE)

    this.logger.log(`security_event=payment_webhook_retention deleted=${deleted}`)
  }
}
