import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import roleName from '@src/common/constants/role.constant'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import { NotificationEventsService } from '@src/modules/notifications/notification-events.service'
import { createHash } from 'crypto'
import type { Prisma, ReportStatus } from 'generated/prisma/client'
import type {
  TCreateReportBody,
  TListAdminReportsQuery,
  TListMyReportsQuery,
  TUpdateReportStatusBody,
} from './model/reports.model'
import { ReportsRepository } from './repositories/reports.repo'

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name)

  constructor(
    private readonly repository: ReportsRepository,
    private readonly notifications: NotificationEventsService,
  ) {}

  async create(userId: number, userRole: string, body: TCreateReportBody) {
    this.assertRenter(userRole)
    const targetId = Number(body.targetId)
    const normalizedTargetId = String(targetId)
    const target = await this.repository.findTarget(body.targetType, targetId)
    if (!target) throw new NotFoundException('Không tìm thấy đối tượng có thể báo cáo')
    if (target.ownerId === userId)
      throw new ForbiddenException('Bạn không thể báo cáo chính mình hoặc nội dung của mình')

    const fingerprint = createHash('sha256').update(`${userId}:${body.targetType}:${body.targetId}`).digest('hex')

    try {
      return await this.repository.create(
        {
          reporterId: userId,
          targetType: body.targetType,
          targetId: normalizedTargetId,
          targetTenantId: target.targetTenantId,
          targetSnapshot: target.snapshot,
          fingerprint,
          reason: body.reason,
          description: body.description ?? null,
          status: 'PENDING',
        },
        userId,
      )
    } catch (error) {
      if (this.isUniqueConflict(error))
        throw new ConflictException('Bạn đã có báo cáo đang được xử lý cho đối tượng này')
      throw error
    }
  }

  async listMine(userId: number, query: TListMyReportsQuery) {
    const { page, limit, skip } = normalizePagination(query)
    const where: Prisma.ReportWhereInput = {
      reporterId: userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.targetType ? { targetType: query.targetType } : {}),
    }
    const [items, total] = await this.repository.findMany(where, skip, limit)
    return buildPaginatedResult(
      items.map((item) => this.toReporterView(item)),
      total,
      page,
      limit,
    )
  }

  async getMine(userId: number, id: number) {
    const report = await this.repository.findById(id)
    if (!report || report.reporterId !== userId) throw new NotFoundException('Không tìm thấy báo cáo của bạn')
    return this.toReporterView(report)
  }

  async list(query: TListAdminReportsQuery) {
    const { page, limit, skip } = normalizePagination(query)
    const [items, total] = await this.repository.findMany(this.buildAdminWhere(query), skip, limit)
    return buildPaginatedResult(items, total, page, limit)
  }

  async getById(id: number) {
    const report = await this.repository.findById(id)
    if (!report) throw new NotFoundException('Không tìm thấy báo cáo')
    return report
  }

  async updateStatus(actorId: number, id: number, body: TUpdateReportStatusBody) {
    const report = await this.getById(id)
    this.assertTransition(report.status, body.status, report.handledBy, actorId)
    const updated = await this.repository.update(id, {
      actorId,
      expectedStatus: report.status,
      status: body.status,
      resolutionNote: body.resolutionNote,
      requireHandler: body.status !== 'REVIEWING',
      action: `${body.status === 'REVIEWING' ? 'CLAIM' : body.status}_REPORT`,
    })
    if (!updated) throw new ConflictException('Báo cáo đã được xử lý bởi thao tác khác')
    if (['RESOLVED', 'REJECTED'].includes(updated.status)) {
      await this.notify(() => this.notifications.notifyReportUpdated(updated))
    }
    return updated
  }

  private assertRenter(role: string) {
    if (role !== roleName.TENANT) throw new ForbiddenException('Chỉ người thuê được gửi báo cáo')
  }

  private assertTransition(current: ReportStatus, next: ReportStatus, handledBy: number | null, actorId: number) {
    if (current === 'PENDING' && next === 'REVIEWING') return
    if (current === 'REVIEWING' && ['RESOLVED', 'REJECTED'].includes(next) && handledBy === actorId) return
    if (current === 'REVIEWING' && handledBy !== actorId) {
      throw new ForbiddenException('Báo cáo đang được quản trị viên khác xử lý')
    }
    throw new ConflictException(`Không thể chuyển báo cáo từ ${current} sang ${next}`)
  }

  private buildAdminWhere(query: TListAdminReportsQuery): Prisma.ReportWhereInput {
    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.targetType ? { targetType: query.targetType } : {}),
      ...(query.reporterId ? { reporterId: query.reporterId } : {}),
      ...(query.handledBy ? { handledBy: query.handledBy } : {}),
      ...(query.from || query.to
        ? { createdAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { reason: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { reporter: { fullName: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }
  }

  private toReporterView(report: NonNullable<Awaited<ReturnType<ReportsRepository['findById']>>>) {
    return {
      id: report.id,
      targetType: report.targetType,
      targetId: report.targetId,
      target: report.targetSnapshot,
      reason: report.reason,
      description: report.description,
      status: report.status,
      resolutionNote: report.resolutionNote,
      createdAt: report.createdAt,
      resolvedAt: report.resolvedAt,
      updatedAt: report.updatedAt,
    }
  }

  private isUniqueConflict(error: unknown) {
    return Boolean(error && typeof error === 'object' && 'code' in error && String(error.code) === 'P2002')
  }

  private async notify(action: () => Promise<unknown>) {
    try {
      await action()
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Không thể gửi thông báo báo cáo')
    }
  }
}
