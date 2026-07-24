import { InjectQueue } from '@nestjs/bullmq'
import { Injectable, type OnModuleInit } from '@nestjs/common'
import type { Queue } from 'bullmq'
import { PAYMENT_WEBHOOK_RETENTION_JOB, PAYMENTS_MAINTENANCE_QUEUE } from './payments-maintenance.constants'

@Injectable()
export class PaymentsMaintenanceScheduler implements OnModuleInit {
  constructor(@InjectQueue(PAYMENTS_MAINTENANCE_QUEUE) private readonly queue: Queue) {}

  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      PAYMENT_WEBHOOK_RETENTION_JOB,
      { pattern: '0 2 * * *' },
      { name: PAYMENT_WEBHOOK_RETENTION_JOB, data: {} },
    )
  }
}
