import { NotFoundException } from '@nestjs/common'
import { NotificationsService } from './notifications.service'

jest.mock('./repositories/notifications.repo', () => ({ NotificationsRepository: class NotificationsRepository {} }))
jest.mock('./notifications.gateway', () => ({ NotificationsGateway: class NotificationsGateway {} }))

describe('NotificationsService', () => {
  let service: NotificationsService
  let repository: Record<string, jest.Mock>
  let gateway: Record<string, jest.Mock>
  let queue: Record<string, jest.Mock>

  beforeEach(() => {
    repository = {
      findNotificationsAndCount: jest.fn(),
      countUnread: jest.fn(),
      createNotifications: jest.fn(),
      findUserNotification: jest.fn(),
      markRead: jest.fn(),
      markAllRead: jest.fn(),
      upsertDeviceToken: jest.fn(),
      disableDeviceToken: jest.fn(),
      createBackgroundJob: jest.fn(),
      setBackgroundJobExternalId: jest.fn(),
    }
    gateway = {
      emitNotificationCreated: jest.fn(),
      emitNotificationRead: jest.fn(),
    }
    queue = {
      add: jest.fn().mockResolvedValue({ id: 'bull-1' }),
    }
    service = new NotificationsService(repository as never, gateway as never, queue as never)
  })

  it('persists, emits and enqueues push notification jobs', async () => {
    repository.createNotifications.mockResolvedValue([
      { id: 1, userId: 10, tenantId: 2, title: 'T', content: 'C', type: 'SYSTEM', data: null, isRead: false, readAt: null },
    ])
    repository.createBackgroundJob.mockResolvedValue({ id: 99 })

    const result = await service.createAndDispatch({ userIds: [10, 10], tenantId: 2, title: 'T', content: 'C', type: 'SYSTEM' })

    expect(repository.createNotifications).toHaveBeenCalledWith(expect.objectContaining({ userIds: [10] }))
    expect(gateway.emitNotificationCreated).toHaveBeenCalledWith(10, expect.objectContaining({ id: 1 }))
    expect(queue.add).toHaveBeenCalledWith('send-push', { backgroundJobId: 99, notificationId: 1 }, expect.any(Object))
    expect(repository.setBackgroundJobExternalId).toHaveBeenCalledWith(99, 'bull-1')
    expect(result).toHaveLength(1)
  })

  it('marks a notification read and emits realtime state', async () => {
    repository.findUserNotification.mockResolvedValue({ id: 1, userId: 10, isRead: false })
    repository.markRead.mockResolvedValue({ id: 1, userId: 10, isRead: true })

    await service.markRead(10, 1)

    expect(repository.markRead).toHaveBeenCalledWith(10, 1)
    expect(gateway.emitNotificationRead).toHaveBeenCalledWith(10, expect.objectContaining({ id: 1, isRead: true }))
  })

  it('throws when marking a missing notification read', async () => {
    repository.findUserNotification.mockResolvedValue(null)

    await expect(service.markRead(10, 404)).rejects.toBeInstanceOf(NotFoundException)
  })
})
