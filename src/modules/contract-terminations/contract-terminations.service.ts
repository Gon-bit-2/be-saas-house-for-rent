import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import { NotificationEventsService } from '@src/modules/notifications/notification-events.service'
import { TenantAccessService } from '@src/shared/modules/services/tenant-access.service'
import type {
  TCompleteContractTerminationBody,
  TCreateContractTerminationBody,
  TListContractTerminationsQuery,
  TReviewContractTerminationBody,
} from './model/contract-terminations.model'
import { ContractTerminationsRepository } from './repositories/contract-terminations.repo'

@Injectable()
export class ContractTerminationsService {
  private readonly logger = new Logger(ContractTerminationsService.name)
  constructor(
    private readonly repository: ContractTerminationsRepository,
    private readonly tenantAccess: TenantAccessService,
    private readonly notifications: NotificationEventsService,
  ) {}

  async list(userId: number, query: TListContractTerminationsQuery) {
    const tenant = await this.tenantAccess.getActiveTenantContext(userId)
    const { page, limit, skip } = normalizePagination(query)
    const [data, total] = await this.repository.findMany(this.where(query, tenant.tenantId), skip, limit)
    return buildPaginatedResult(data, total, page, limit)
  }

  async listMine(userId: number, query: TListContractTerminationsQuery) {
    const { page, limit, skip } = normalizePagination(query)
    const [data, total] = await this.repository.findMine(userId, this.where(query), skip, limit)
    return buildPaginatedResult(data, total, page, limit)
  }

  async getById(userId: number, id: number) {
    const tenant = await this.tenantAccess.getActiveTenantContext(userId)
    const request = await this.repository.findById(tenant.tenantId, id)
    if (!request) throw new NotFoundException('Không tìm thấy yêu cầu thanh lý')
    return request
  }

  async getMine(userId: number, id: number) {
    const request = await this.repository.getMine(userId, id)
    if (!request) throw new NotFoundException('Không tìm thấy yêu cầu thanh lý của bạn')
    return request
  }

  async create(userId: number, body: TCreateContractTerminationBody) {
    const tenant = await this.tenantAccess.getActiveTenantContext(userId)
    const contract = await this.repository.getContract(tenant.tenantId, body.contractId)
    return this.createForContract(userId, body, contract)
  }

  async createMine(userId: number, body: TCreateContractTerminationBody) {
    const contract = await this.repository.getMyContract(userId, body.contractId)
    return this.createForContract(userId, body, contract)
  }

  async approve(userId: number, id: number, body: TReviewContractTerminationBody) {
    return this.review(userId, id, 'APPROVED', body.reviewNote)
  }
  async reject(userId: number, id: number, body: TReviewContractTerminationBody) {
    return this.review(userId, id, 'REJECTED', body.reviewNote)
  }

  async cancel(userId: number, id: number) {
    const tenant = await this.tenantAccess.getActiveTenantContext(userId)
    const request = await this.repository.findById(tenant.tenantId, id)
    if (!request) throw new NotFoundException('Không tìm thấy yêu cầu thanh lý')
    if (request.status === 'CANCELED') return request
    const updated = await this.repository.update({
      tenantId: tenant.tenantId,
      id,
      statuses: ['PENDING'],
      data: { status: 'CANCELED', updatedById: userId },
      actorId: userId,
      action: 'CANCEL_CONTRACT_TERMINATION',
    })
    if (!updated) throw new ConflictException('Yêu cầu không còn ở trạng thái chờ xử lý')
    await this.notify(() => this.notifications.notifyTerminationChanged(updated, 'CANCELED'))
    return updated
  }

  async cancelMine(userId: number, id: number) {
    const request = await this.repository.getMine(userId, id)
    if (!request) throw new NotFoundException('Không tìm thấy yêu cầu thanh lý của bạn')
    if (request.contract.renterId !== userId || request.createdById !== userId)
      throw new BadRequestException('Bạn chỉ có thể hủy yêu cầu do chính mình tạo')
    if (request.status === 'CANCELED') return request
    const updated = await this.repository.update({
      tenantId: request.tenantId,
      id,
      statuses: ['PENDING'],
      data: { status: 'CANCELED', updatedById: userId },
      actorId: userId,
      action: 'CANCEL_CONTRACT_TERMINATION',
    })
    if (!updated) throw new ConflictException('Yêu cầu không còn ở trạng thái chờ xử lý')
    await this.notify(() => this.notifications.notifyTerminationChanged(updated, 'CANCELED'))
    return updated
  }

  async complete(userId: number, id: number, body: TCompleteContractTerminationBody) {
    const tenant = await this.tenantAccess.getActiveTenantContext(userId)
    const request = await this.repository.findById(tenant.tenantId, id)
    if (!request) throw new NotFoundException('Không tìm thấy yêu cầu thanh lý')
    if (request.status === 'COMPLETED') return request
    if (request.status !== 'APPROVED') throw new BadRequestException('Yêu cầu thanh lý chưa được duyệt')
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    if (body.actualMoveOutDate > today) throw new BadRequestException('Ngày trả phòng thực tế không được ở tương lai')
    if (body.actualMoveOutDate < request.contract.startDate)
      throw new BadRequestException('Ngày trả phòng không được trước ngày bắt đầu hợp đồng')
    if (body.acknowledgeOutstandingDebt && !body.completionNote)
      throw new BadRequestException('Cần ghi chú khi xác nhận công nợ còn mở')

    let result: Awaited<ReturnType<ContractTerminationsRepository['complete']>>
    try {
      result = await this.repository.complete({
        tenantId: tenant.tenantId,
        id,
        handoverId: body.checkoutHandoverId,
        actualMoveOutDate: body.actualMoveOutDate,
        acknowledgeDebt: body.acknowledgeOutstandingDebt,
        completionNote: body.completionNote,
        actorId: userId,
      })
    } catch (error) {
      if ((error instanceof Error && error.message === 'ACTIVE_RENTAL_HISTORY_NOT_FOUND') || this.isConflict(error))
        throw new ConflictException('Không thể hoàn tất do dữ liệu vòng đời hợp đồng đã thay đổi')
      throw error
    }
    if (result.kind === 'handover')
      throw new BadRequestException('Biên bản trả phòng chưa được xác nhận hoặc không thuộc hợp đồng')
    if (result.kind === 'debt')
      throw new ConflictException({
        message: 'Hợp đồng còn công nợ; cần xác nhận trước khi hoàn tất',
        outstandingDebt: result.amount,
      })
    if (result.kind === 'conflict') throw new ConflictException('Trạng thái hợp đồng hoặc yêu cầu đã thay đổi')
    await this.notify(() => this.notifications.notifyTerminationChanged(result.data, 'COMPLETED'))
    return { ...result.data, roomStatus: result.roomStatus }
  }

  private async createForContract(
    userId: number,
    body: TCreateContractTerminationBody,
    contract: Awaited<ReturnType<ContractTerminationsRepository['getContract']>>,
  ) {
    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng')
    if (contract.status !== 'ACTIVE')
      throw new BadRequestException('Chỉ tạo yêu cầu thanh lý cho hợp đồng đang hiệu lực')
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    if (body.expectedMoveOutDate < today) throw new BadRequestException('Ngày dự kiến trả phòng không được ở quá khứ')
    try {
      const created = await this.repository.create(
        {
          tenantId: contract.tenantId,
          contractId: contract.id,
          reason: body.reason,
          expectedMoveOutDate: body.expectedMoveOutDate,
          status: 'PENDING',
          createdById: userId,
          updatedById: userId,
        },
        userId,
      )
      await this.notify(() => this.notifications.notifyTerminationChanged(created, 'CREATED'))
      return created
    } catch (error) {
      if (this.isConflict(error)) throw new ConflictException('Hợp đồng đã có yêu cầu thanh lý đang mở')
      throw error
    }
  }

  private async review(userId: number, id: number, status: 'APPROVED' | 'REJECTED', reviewNote: string) {
    const tenant = await this.tenantAccess.getActiveTenantContext(userId)
    const request = await this.repository.findById(tenant.tenantId, id)
    if (!request) throw new NotFoundException('Không tìm thấy yêu cầu thanh lý')
    if (request.status === status) return request
    const updated = await this.repository.update({
      tenantId: tenant.tenantId,
      id,
      statuses: ['PENDING'],
      data: { status, reviewNote, reviewedById: userId, reviewedAt: new Date(), updatedById: userId },
      actorId: userId,
      action: status === 'APPROVED' ? 'APPROVE_CONTRACT_TERMINATION' : 'REJECT_CONTRACT_TERMINATION',
    })
    if (!updated) throw new ConflictException('Yêu cầu không còn ở trạng thái chờ xử lý')
    await this.notify(() => this.notifications.notifyTerminationChanged(updated, status))
    return updated
  }

  private where(query: TListContractTerminationsQuery, tenantId?: number) {
    return {
      ...(tenantId ? { tenantId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.contractId ? { contractId: query.contractId } : {}),
      ...(query.roomId ? { contract: { roomId: query.roomId } } : {}),
    }
  }
  private isConflict(error: unknown) {
    return Boolean(
      error && typeof error === 'object' && 'code' in error && ['P2002', 'P2034'].includes(String(error.code)),
    )
  }
  private async notify(action: () => Promise<unknown>) {
    try {
      await action()
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Không thể gửi thông báo thanh lý')
    }
  }
}
