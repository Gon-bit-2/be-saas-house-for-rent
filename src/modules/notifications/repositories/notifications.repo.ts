import { Injectable } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import type { BackgroundJobStatus, DevicePlatform, NotificationType, Prisma } from 'generated/prisma/client'

export const notificationSelect = {
  id: true,
  userId: true,
  tenantId: true,
  title: true,
  content: true,
  type: true,
  data: true,
  isRead: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect

export const deviceTokenSelect = {
  id: true,
  userId: true,
  token: true,
  fid: true,
  platform: true,
  deviceName: true,
  isActive: true,
  lastSeenAt: true,
  lastUsedAt: true,
  failureCount: true,
  lastError: true,
  disabledAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DeviceTokenSelect

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findNotificationsAndCount(where: Prisma.NotificationWhereInput, skip: number, take: number) {
    return this.prismaService.$transaction([
      this.prismaService.notification.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: notificationSelect,
      }),
      this.prismaService.notification.count({ where }),
    ])
  }

  async countUnread(userId: number) {
    return this.prismaService.notification.count({ where: { userId, isRead: false } })
  }

  async createNotifications(input: {
    userIds: number[]
    tenantId?: number | null
    title: string
    content: string
    type: NotificationType
    data?: Prisma.InputJsonValue
  }) {
    return this.prismaService.$transaction(
      input.userIds.map((userId) =>
        this.prismaService.notification.create({
          data: {
            userId,
            tenantId: input.tenantId ?? null,
            title: input.title,
            content: input.content,
            type: input.type,
            data: input.data,
          },
          select: notificationSelect,
        }),
      ),
    )
  }

  async findUserNotification(userId: number, id: number) {
    return this.prismaService.notification.findFirst({ where: { id, userId }, select: notificationSelect })
  }

  async markRead(userId: number, id: number) {
    return this.prismaService.notification.update({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
      select: notificationSelect,
    })
  }

  async markAllRead(userId: number) {
    await this.prismaService.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    })
    return this.countUnread(userId)
  }

  async upsertDeviceToken(input: {
    userId: number
    token: string
    fid?: string
    platform: DevicePlatform
    deviceName?: string
  }) {
    const now = new Date()
    return this.prismaService.deviceToken.upsert({
      where: { userId_token: { userId: input.userId, token: input.token } },
      create: {
        userId: input.userId,
        token: input.token,
        fid: input.fid,
        platform: input.platform,
        deviceName: input.deviceName,
        isActive: true,
        lastSeenAt: now,
      },
      update: {
        fid: input.fid,
        platform: input.platform,
        deviceName: input.deviceName,
        isActive: true,
        disabledAt: null,
        lastSeenAt: now,
        failureCount: 0,
        lastError: null,
      },
      select: deviceTokenSelect,
    })
  }

  async disableDeviceToken(userId: number, id: number) {
    return this.prismaService.deviceToken.update({
      where: { id, userId },
      data: { isActive: false, disabledAt: new Date() },
      select: deviceTokenSelect,
    })
  }

  async findActiveDeviceTokens(userId: number) {
    return this.prismaService.deviceToken.findMany({
      where: { userId, isActive: true },
      orderBy: [{ updatedAt: 'desc' }],
      select: deviceTokenSelect,
    })
  }

  async markTokenSuccess(id: number) {
    return this.prismaService.deviceToken.update({
      where: { id },
      data: { lastUsedAt: new Date(), failureCount: 0, lastError: null },
      select: { id: true },
    })
  }

  async markTokenFailure(id: number, errorCode: string, disable: boolean) {
    return this.prismaService.deviceToken.update({
      where: { id },
      data: {
        lastUsedAt: new Date(),
        failureCount: { increment: 1 },
        lastError: errorCode,
        ...(disable ? { isActive: false, disabledAt: new Date() } : {}),
      },
      select: { id: true },
    })
  }

  async findNotificationForPush(id: number) {
    return this.prismaService.notification.findUnique({ where: { id }, select: notificationSelect })
  }

  async createBackgroundJob(input: { tenantId?: number | null; jobType: string; payload: Prisma.InputJsonValue }) {
    return this.prismaService.backgroundJob.create({
      data: {
        tenantId: input.tenantId ?? null,
        queueName: 'notifications',
        jobType: input.jobType,
        payload: input.payload,
        status: 'WAITING',
      },
      select: { id: true },
    })
  }

  async setBackgroundJobExternalId(id: number, externalJobId: string) {
    return this.prismaService.backgroundJob.update({ where: { id }, data: { externalJobId }, select: { id: true } })
  }

  async updateBackgroundJobStatus(
    id: number,
    status: BackgroundJobStatus,
    data?: { attempts?: number; errorMessage?: string | null },
  ) {
    return this.prismaService.backgroundJob.update({
      where: { id },
      data: {
        status,
        attempts: data?.attempts,
        errorMessage: data?.errorMessage,
        ...(status === 'ACTIVE' ? { processedAt: new Date() } : {}),
        ...(status === 'COMPLETED' || status === 'FAILED' ? { completedAt: new Date() } : {}),
      },
      select: { id: true },
    })
  }

  async findTenantNotificationRecipients(tenantId: number, roles: string[]) {
    const tenant = await this.prismaService.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: {
        ownerUserId: true,
        members: {
          where: { status: 'ACTIVE', roleId: { in: roles } },
          select: { userId: true },
        },
      },
    })
    if (!tenant) {
      return []
    }
    return [...new Set([tenant.ownerUserId, ...tenant.members.map((member) => member.userId)])]
  }

  async findSystemAdminRecipients() {
    const users = await this.prismaService.user.findMany({
      where: { systemRole: 'ADMIN', status: 'ACTIVE', deletedAt: null },
      select: { id: true },
    })
    return users.map((user) => user.id)
  }
}
