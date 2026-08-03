import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { ReportsService } from './reports.service'

jest.mock('@src/modules/notifications/notification-events.service', () => ({
  NotificationEventsService: class NotificationEventsService {},
}))
jest.mock('./repositories/reports.repo', () => ({ ReportsRepository: class ReportsRepository {} }))

describe('ReportsService', () => {
  let service: ReportsService
  let repository: Record<string, jest.Mock>
  let notifications: Record<string, jest.Mock>

  const report = {
    id: 1,
    reporterId: 40,
    targetType: 'ROOM',
    targetId: '20',
    targetTenantId: 10,
    targetSnapshot: { id: 20, title: 'Phòng 20' },
    reason: 'Thông tin không chính xác',
    description: null,
    status: 'PENDING',
    handledBy: null,
    reviewingAt: null,
    resolutionNote: null,
    createdAt: new Date('2026-07-30T00:00:00Z'),
    resolvedAt: null,
    updatedAt: new Date('2026-07-30T00:00:00Z'),
    reporter: { id: 40, fullName: 'Nguyen Van A', email: 'a@example.com' },
    handledByUser: null,
  }

  const body = {
    targetType: 'ROOM' as const,
    targetId: '20',
    reason: 'Thông tin không chính xác',
  }

  beforeEach(() => {
    repository = {
      findMany: jest.fn(),
      findById: jest.fn(),
      findTarget: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    }
    notifications = { notifyReportUpdated: jest.fn().mockResolvedValue(undefined) }
    service = new ReportsService(repository as never, notifications as never)
  })

  it('creates a pending report with a target snapshot', async () => {
    repository.findTarget.mockResolvedValue({ targetTenantId: 10, ownerId: null, snapshot: { id: 20 } })
    repository.create.mockResolvedValue(report)

    await service.create(40, 'TENANT', body)

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        reporterId: 40,
        targetType: 'ROOM',
        targetId: '20',
        targetSnapshot: { id: 20 },
        fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
        status: 'PENDING',
      }),
      40,
    )
  })

  it('requires the exact renter role for submission', async () => {
    await expect(service.create(40, 'ADMIN', body)).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('rejects a missing target and self-report', async () => {
    repository.findTarget.mockResolvedValueOnce(null)
    await expect(service.create(40, 'TENANT', body)).rejects.toBeInstanceOf(NotFoundException)

    repository.findTarget.mockResolvedValueOnce({ targetTenantId: null, ownerId: 40, snapshot: { id: 40 } })
    await expect(service.create(40, 'TENANT', { ...body, targetType: 'USER', targetId: '40' })).rejects.toBeInstanceOf(
      ForbiddenException,
    )
  })

  it('maps a concurrent open duplicate to conflict', async () => {
    repository.findTarget.mockResolvedValue({ targetTenantId: 10, ownerId: null, snapshot: { id: 20 } })
    repository.create.mockRejectedValue({ code: 'P2002' })
    await expect(service.create(40, 'TENANT', body)).rejects.toBeInstanceOf(ConflictException)
  })

  it('hides moderator identity from the reporter view', async () => {
    repository.findById.mockResolvedValue({
      ...report,
      status: 'RESOLVED',
      handledBy: 99,
      handledByUser: { id: 99, fullName: 'Admin', email: 'admin@example.com' },
      resolutionNote: 'Đã xử lý',
    })

    const result = await service.getMine(40, 1)
    expect(result).not.toHaveProperty('handledBy')
    expect(result).not.toHaveProperty('handledByUser')
    expect(result.resolutionNote).toBe('Đã xử lý')
  })

  it('claims a pending report', async () => {
    repository.findById.mockResolvedValue(report)
    repository.update.mockResolvedValue({ ...report, status: 'REVIEWING', handledBy: 99 })

    await service.updateStatus(99, 1, { status: 'REVIEWING' })

    expect(repository.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ expectedStatus: 'PENDING', status: 'REVIEWING', requireHandler: false }),
    )
  })

  it('allows only the handler to resolve a report', async () => {
    repository.findById.mockResolvedValue({ ...report, status: 'REVIEWING', handledBy: 98 })
    await expect(
      service.updateStatus(99, 1, { status: 'RESOLVED', resolutionNote: 'Đã xác minh' }),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('resolves a claimed report and notifies the reporter', async () => {
    const reviewing = { ...report, status: 'REVIEWING', handledBy: 99 }
    repository.findById.mockResolvedValue(reviewing)
    repository.update.mockResolvedValue({ ...reviewing, status: 'RESOLVED', resolutionNote: 'Đã xác minh' })

    await service.updateStatus(99, 1, { status: 'RESOLVED', resolutionNote: 'Đã xác minh' })

    expect(repository.update).toHaveBeenCalledWith(1, expect.objectContaining({ requireHandler: true }))
    expect(notifications.notifyReportUpdated).toHaveBeenCalled()
  })
})
