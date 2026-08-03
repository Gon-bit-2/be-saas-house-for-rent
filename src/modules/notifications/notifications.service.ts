import { InjectQueue } from '@nestjs/bullmq'
import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import envConfig from '@src/config/env.config'
import type { NotificationType, Prisma } from 'generated/prisma/client'
import type { Queue } from 'bullmq'
import { NOTIFICATIONS_QUEUE, SEND_PUSH_JOB, type SendPushJobData } from './notifications.constants'
import type { TListNotificationsQuerySchema, TRegisterDeviceTokenBodySchema } from './model/notifications.model'
import { NotificationsGateway } from './notifications.gateway'
import { NotificationsRepository } from './repositories/notifications.repo'

export type CreateNotificationInput = {
  userIds: number[]
  tenantId?: number | null
  title: string
  content: string
  type: NotificationType
  data?: Prisma.InputJsonValue
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly notificationsGateway: NotificationsGateway,
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly notificationsQueue: Queue<SendPushJobData>,
  ) {}

  async listMine(userId: number, query: TListNotificationsQuerySchema) {
    const { page, limit, skip } = normalizePagination(query)
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.isRead === undefined ? {} : { isRead: query.isRead }),
    }
    const [notifications, total] = await this.notificationsRepository.findNotificationsAndCount(where, skip, limit)
    return buildPaginatedResult(notifications, total, page, limit)
  }

  countUnread(userId: number) {
    return this.notificationsRepository.countUnread(userId)
  }

  async markRead(userId: number, id: number) {
    const notification = await this.notificationsRepository.findUserNotification(userId, id)
    if (!notification) {
      throw new NotFoundException('Không tìm thấy thông báo')
    }
    const updated = notification.isRead ? notification : await this.notificationsRepository.markRead(userId, id)
    this.notificationsGateway.emitNotificationRead(userId, updated)
    return updated
  }

  async markAllRead(userId: number) {
    const unreadCount = await this.notificationsRepository.markAllRead(userId)
    this.notificationsGateway.emitNotificationRead(userId, { all: true, unreadCount })
    return { unreadCount }
  }

  async registerDeviceToken(userId: number, body: TRegisterDeviceTokenBodySchema) {
    return this.notificationsRepository.upsertDeviceToken({ userId, ...body })
  }

  async disableDeviceToken(userId: number, id: number) {
    return this.notificationsRepository.disableDeviceToken(userId, id)
  }

  async sendTest(userId: number) {
    if (envConfig.NODE_ENV !== 'development') {
      throw new NotFoundException('Không tìm thấy tài nguyên')
    }

    const [notification] = await this.createAndDispatch({
      userIds: [userId],
      title: 'Thông báo thử nghiệm',
      content: 'Firebase FCM và thông báo nội bộ đã sẵn sàng.',
      type: 'SYSTEM',
      data: { sourceType: 'SYSTEM', sourceId: 'test' },
    })
    return notification
  }

  async createAndDispatch(input: CreateNotificationInput) {
    const userIds = [...new Set(input.userIds)].filter((userId) => Number.isInteger(userId) && userId > 0)
    if (userIds.length === 0) {
      return []
    }

    const notifications = await this.notificationsRepository.createNotifications({ ...input, userIds })
    for (const notification of notifications) {
      this.notificationsGateway.emitNotificationCreated(notification.userId, notification)
      await this.enqueuePush(notification.id, notification.tenantId, {
        notificationId: notification.id,
        userId: notification.userId,
        type: notification.type,
      })
    }
    return notifications
  }

  private async enqueuePush(notificationId: number, tenantId: number | null, payload: Prisma.InputJsonValue) {
    let backgroundJobId: number | null = null
    try {
      const backgroundJob = await this.notificationsRepository.createBackgroundJob({
        tenantId,
        jobType: SEND_PUSH_JOB,
        payload,
      })
      backgroundJobId = backgroundJob.id
      const job = await this.notificationsQueue.add(
        SEND_PUSH_JOB,
        { backgroundJobId: backgroundJob.id, notificationId },
        {
          attempts: 5,
          backoff: { type: 'exponential', delay: 3_000, jitter: 0.5 },
          removeOnComplete: 1_000,
          removeOnFail: 5_000,
        },
      )
      try {
        await this.notificationsRepository.setBackgroundJobExternalId(backgroundJob.id, String(job.id))
      } catch (error) {
        this.logger.error(this.sanitizeQueueError(error))
      }
    } catch (error) {
      const message = this.sanitizeQueueError(error)
      if (backgroundJobId) {
        try {
          await this.notificationsRepository.updateBackgroundJobStatus(backgroundJobId, 'FAILED', {
            errorMessage: message,
          })
        } catch {
          // The inbox notification is already committed; a secondary bookkeeping failure remains non-blocking.
        }
      }
      this.logger.error(message)
    }
  }

  private sanitizeQueueError(error: unknown) {
    const raw = error instanceof Error ? error.message : 'Không thể enqueue push notification'
    return raw.replace(/\b(?:redis|rediss):\/\/[^\s]+/gi, '[redis-url-redacted]').slice(0, 1000)
  }
}
