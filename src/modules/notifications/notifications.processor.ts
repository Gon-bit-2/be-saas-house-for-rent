import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Injectable } from '@nestjs/common'
import type { Job } from 'bullmq'
import { NOTIFICATIONS_QUEUE, SEND_PUSH_JOB, type SendPushJobData } from './notifications.constants'
import { FirebasePushService } from './firebase-push.service'
import { NotificationsRepository } from './repositories/notifications.repo'

@Injectable()
@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly firebasePushService: FirebasePushService,
  ) {
    super()
  }

  async process(job: Job<SendPushJobData>) {
    if (job.name !== SEND_PUSH_JOB) {
      return
    }

    await this.notificationsRepository.updateBackgroundJobStatus(job.data.backgroundJobId, 'ACTIVE', {
      attempts: job.attemptsMade + 1,
    })

    try {
      const notification = await this.notificationsRepository.findNotificationForPush(job.data.notificationId)
      if (!notification) {
        await this.notificationsRepository.updateBackgroundJobStatus(job.data.backgroundJobId, 'COMPLETED', {
          attempts: job.attemptsMade + 1,
        })
        return
      }

      const tokens = await this.notificationsRepository.findActiveDeviceTokens(notification.userId)
      const results = await this.firebasePushService.sendToTokens(notification, tokens)
      let hasTemporaryFailure = false
      for (const result of results) {
        if (result.success) {
          await this.notificationsRepository.markTokenSuccess(result.tokenId)
        } else {
          await this.notificationsRepository.markTokenFailure(
            result.tokenId,
            result.errorCode ?? 'messaging/unknown',
            result.disableToken,
          )
          hasTemporaryFailure ||= !result.disableToken
        }
      }

      if (hasTemporaryFailure) {
        throw new Error('FCM_TEMPORARY_FAILURE')
      }

      await this.notificationsRepository.updateBackgroundJobStatus(job.data.backgroundJobId, 'COMPLETED', {
        attempts: job.attemptsMade + 1,
      })
    } catch (error) {
      const maxAttempts = typeof job.opts.attempts === 'number' ? job.opts.attempts : 1
      await this.notificationsRepository.updateBackgroundJobStatus(
        job.data.backgroundJobId,
        job.attemptsMade + 1 >= maxAttempts ? 'FAILED' : 'RETRYING',
        {
          attempts: job.attemptsMade + 1,
          errorMessage: this.sanitizeError(error),
        },
      )
      throw error
    }
  }

  private sanitizeError(error: unknown) {
    const raw = error instanceof Error ? error.message : 'Push notification failed'
    return raw.replace(/\b(?:redis|rediss|https?):\/\/[^\s]+/gi, '[url-redacted]').slice(0, 1000)
  }
}
