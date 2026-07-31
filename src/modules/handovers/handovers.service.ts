import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import { NotificationEventsService } from '@src/modules/notifications/notification-events.service'
import { TenantAccessService } from '@src/shared/modules/services/tenant-access.service'
import { createHash } from 'crypto'
import type {
  TConfirmHandoverBody,
  TCreateHandoverBody,
  TDisputeHandoverBody,
  THandoverItem,
  TListHandoversQuery,
  TResolveHandoverBody,
  TUpdateHandoverBody,
} from './model/handovers.model'
import { HandoversRepository } from './repositories/handovers.repo'

type SnapshotItem = {
  roomAssetId: number
  assetName: string
  categoryName: string
  expectedQuantity: number
  actualQuantity: number
  condition: 'NEW' | 'GOOD' | 'NORMAL' | 'DAMAGED' | 'LOST'
  note?: string | null
  imageUrl?: string | null
}

@Injectable()
export class HandoversService {
  private readonly logger = new Logger(HandoversService.name)
  constructor(
    private readonly repository: HandoversRepository,
    private readonly tenantAccess: TenantAccessService,
    private readonly notifications: NotificationEventsService,
  ) {}

  async list(userId: number, query: TListHandoversQuery) {
    const tenant = await this.tenantAccess.getActiveTenantContext(userId)
    const { page, limit, skip } = normalizePagination(query)
    const [data, total] = await this.repository.findMany(this.where(query, tenant.tenantId), skip, limit)
    return buildPaginatedResult(data, total, page, limit)
  }

  async listMine(userId: number, query: TListHandoversQuery) {
    const { page, limit, skip } = normalizePagination(query)
    const [data, total] = await this.repository.findMine(userId, this.where(query), skip, limit)
    return buildPaginatedResult(data, total, page, limit)
  }

  async getById(userId: number, id: number) {
    const tenant = await this.tenantAccess.getActiveTenantContext(userId)
    const record = await this.repository.findById(tenant.tenantId, id)
    if (!record) throw new NotFoundException('Không tìm thấy biên bản bàn giao')
    return record
  }

  async getMine(userId: number, id: number) {
    const record = await this.repository.getMine(userId, id)
    if (!record) throw new NotFoundException('Không tìm thấy biên bản bàn giao của bạn')
    return record
  }

  async create(userId: number, body: TCreateHandoverBody) {
    const tenant = await this.tenantAccess.getActiveTenantContext(userId)
    const contract = await this.repository.getContract(tenant.tenantId, body.contractId)
    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng')
    if (contract.status !== 'ACTIVE') throw new BadRequestException('Chỉ lập bàn giao cho hợp đồng đang hiệu lực')
    if (body.type === 'CHECKOUT' && contract.terminationRequests.length === 0)
      throw new BadRequestException('Cần duyệt yêu cầu thanh lý trước khi lập biên bản trả phòng')

    const baseline = await this.baseline(contract.roomId, contract.id, body.type)
    const items = this.applyItems(baseline, body.items)
    const contentHash = this.hash(body.note ?? null, items, 1)
    try {
      const created = await this.repository.create(
        {
          tenantId: tenant.tenantId,
          contractId: contract.id,
          roomId: contract.roomId,
          type: body.type,
          note: body.note ?? null,
          status: 'DRAFT',
          version: 1,
          contentHash,
          createdById: userId,
          updatedById: userId,
        },
        items,
        userId,
      )
      await this.notify(() => this.notifications.notifyHandoverChanged(created, 'CREATED'))
      return created
    } catch (error) {
      if (this.isConflict(error)) throw new ConflictException('Hợp đồng đã có biên bản cùng loại')
      throw error
    }
  }

  async update(userId: number, id: number, body: TUpdateHandoverBody) {
    const tenant = await this.tenantAccess.getActiveTenantContext(userId)
    const record = await this.repository.findById(tenant.tenantId, id)
    if (!record) throw new NotFoundException('Không tìm thấy biên bản bàn giao')
    if (record.status !== 'DRAFT' || record.signedByLandlordAt || record.signedByRenterAt)
      throw new BadRequestException('Không thể sửa biên bản đã ký hoặc đang tranh chấp')
    const baseline = await this.baseline(record.roomId, record.contractId, record.type)
    const items = body.items ? this.applyItems(baseline, body.items) : undefined
    const hashItems = items ?? record.assetItems
    const contentHash = this.hash(body.note === undefined ? record.note : body.note, hashItems, record.version)
    const updated = await this.repository.update({
      tenantId: tenant.tenantId,
      id,
      version: body.version,
      statuses: ['DRAFT'],
      data: { note: body.note, contentHash, updatedById: userId },
      items,
      actorId: userId,
      action: 'UPDATE_HANDOVER',
      requireUnsigned: true,
    })
    if (!updated) throw new ConflictException('Biên bản đã được cập nhật bởi thao tác khác')
    return updated
  }

  async confirmStaff(userId: number, id: number, body: TConfirmHandoverBody) {
    const tenant = await this.tenantAccess.getActiveTenantContext(userId)
    const record = await this.repository.findById(tenant.tenantId, id)
    if (!record) throw new NotFoundException('Không tìm thấy biên bản bàn giao')
    if (record.status !== 'DRAFT') throw new BadRequestException('Chỉ xác nhận biên bản nháp')
    if (record.signedByLandlordAt) return record
    return this.confirm(tenant.tenantId, record, body.version, userId, 'landlord')
  }

  async confirmMine(userId: number, id: number, body: TConfirmHandoverBody) {
    const record = await this.repository.getMine(userId, id)
    if (!record) throw new NotFoundException('Không tìm thấy biên bản bàn giao của bạn')
    if (record.contract.renterId !== userId)
      throw new BadRequestException('Chỉ người thuê chính được xác nhận biên bản')
    if (record.status !== 'DRAFT') throw new BadRequestException('Chỉ xác nhận biên bản nháp')
    if (record.signedByRenterAt) return record
    return this.confirm(record.tenantId, record, body.version, userId, 'renter')
  }

  async disputeStaff(userId: number, id: number, body: TDisputeHandoverBody) {
    const tenant = await this.tenantAccess.getActiveTenantContext(userId)
    const record = await this.repository.findById(tenant.tenantId, id)
    if (!record) throw new NotFoundException('Không tìm thấy biên bản bàn giao')
    return this.dispute(record, userId, body)
  }

  async disputeMine(userId: number, id: number, body: TDisputeHandoverBody) {
    const record = await this.repository.getMine(userId, id)
    if (!record) throw new NotFoundException('Không tìm thấy biên bản bàn giao của bạn')
    if (record.contract.renterId !== userId) throw new BadRequestException('Chỉ người thuê chính được mở tranh chấp')
    return this.dispute(record, userId, body)
  }

  async resolve(userId: number, id: number, body: TResolveHandoverBody) {
    const tenant = await this.tenantAccess.getActiveTenantContext(userId)
    const record = await this.repository.findById(tenant.tenantId, id)
    if (!record) throw new NotFoundException('Không tìm thấy biên bản bàn giao')
    if (record.status !== 'DISPUTED') throw new BadRequestException('Biên bản không ở trạng thái tranh chấp')
    const baseline = await this.baseline(record.roomId, record.contractId, record.type)
    const items = body.items
      ? this.applyItems(baseline, body.items)
      : record.assetItems.map((item) => ({ ...item, note: item.note, imageUrl: item.imageUrl }))
    const version = record.version + 1
    const contentHash = this.hash(body.note === undefined ? record.note : body.note, items, version)
    const updated = await this.repository.update({
      tenantId: tenant.tenantId,
      id,
      version: body.version,
      statuses: ['DISPUTED'],
      data: {
        status: 'DRAFT',
        version,
        contentHash,
        note: body.note,
        signedByLandlordId: null,
        signedByLandlordAt: null,
        signedByRenterId: null,
        signedByRenterAt: null,
        confirmedAt: null,
        resolvedById: userId,
        resolvedAt: new Date(),
        resolutionNote: body.resolutionNote,
        updatedById: userId,
      },
      items: body.items ? items : undefined,
      actorId: userId,
      action: 'RESOLVE_HANDOVER_DISPUTE',
    })
    if (!updated) throw new ConflictException('Biên bản đã được cập nhật bởi thao tác khác')
    await this.notify(() => this.notifications.notifyHandoverChanged(updated, 'RESOLVED'))
    return updated
  }

  private async confirm(
    tenantId: number,
    record: Awaited<ReturnType<HandoversRepository['findById']>> extends infer T ? NonNullable<T> : never,
    version: number,
    actorId: number,
    side: 'landlord' | 'renter',
  ) {
    const now = new Date()
    const data =
      side === 'landlord'
        ? { signedByLandlordId: actorId, signedByLandlordAt: now, updatedById: actorId }
        : { signedByRenterId: actorId, signedByRenterAt: now, updatedById: actorId }
    const updated = await this.repository.update({
      tenantId,
      id: record.id,
      version,
      statuses: ['DRAFT'],
      data,
      actorId,
      action: 'CONFIRM_HANDOVER',
      finalizeConfirmation: true,
    })
    if (!updated) throw new ConflictException('Biên bản đã được cập nhật bởi thao tác khác')
    await this.notify(() =>
      this.notifications.notifyHandoverChanged(updated, updated.status === 'CONFIRMED' ? 'CONFIRMED' : 'SIGNED'),
    )
    return updated
  }

  private async dispute(
    record: NonNullable<Awaited<ReturnType<HandoversRepository['findById']>>>,
    actorId: number,
    body: TDisputeHandoverBody,
  ) {
    if (record.status === 'DISPUTED') return record
    if (!['DRAFT', 'CONFIRMED'].includes(record.status))
      throw new BadRequestException('Không thể tranh chấp biên bản ở trạng thái hiện tại')
    const updated = await this.repository.update({
      tenantId: record.tenantId,
      id: record.id,
      version: body.version,
      statuses: ['DRAFT', 'CONFIRMED'],
      data: {
        status: 'DISPUTED',
        disputedById: actorId,
        disputedAt: new Date(),
        disputeReason: body.reason,
        updatedById: actorId,
      },
      actorId,
      action: 'DISPUTE_HANDOVER',
    })
    if (!updated) throw new ConflictException('Biên bản đã được cập nhật bởi thao tác khác')
    await this.notify(() => this.notifications.notifyHandoverChanged(updated, 'DISPUTED'))
    return updated
  }

  private async baseline(roomId: number, contractId: number, type: 'CHECKIN' | 'CHECKOUT'): Promise<SnapshotItem[]> {
    if (type === 'CHECKOUT') {
      const checkin = await this.repository.getCheckin(contractId)
      if (checkin)
        return checkin.assetItems.map((item) => ({
          roomAssetId: item.roomAssetId,
          assetName: item.assetName,
          categoryName: item.categoryName,
          expectedQuantity: item.actualQuantity,
          actualQuantity: item.actualQuantity,
          condition: item.condition,
          note: item.note,
          imageUrl: item.imageUrl,
        }))
    }
    const assets = await this.repository.getAssets(roomId)
    return assets.map((asset) => ({
      roomAssetId: asset.id,
      assetName: asset.name,
      categoryName: asset.category.name,
      expectedQuantity: asset.quantity,
      actualQuantity: asset.quantity,
      condition: asset.condition,
      note: asset.description,
      imageUrl: asset.imageUrl,
    }))
  }

  private applyItems(baseline: SnapshotItem[], input?: THandoverItem[]): SnapshotItem[] {
    if (!input) return baseline
    const source = new Map(baseline.map((item) => [item.roomAssetId, item]))
    if (new Set(input.map((item) => item.roomAssetId)).size !== input.length)
      throw new BadRequestException('Tài sản trong biên bản không được trùng')
    return input.map((item) => {
      const base = source.get(item.roomAssetId)
      if (!base) throw new BadRequestException('Tài sản không thuộc phòng hoặc không nằm trong biên bản nhận phòng')
      return {
        ...base,
        actualQuantity: item.actualQuantity,
        condition: item.condition,
        note: item.note ?? null,
        imageUrl: item.imageUrl ?? null,
      }
    })
  }

  private hash(
    note: string | null | undefined,
    items: Array<{
      roomAssetId: number
      expectedQuantity: number
      actualQuantity: number
      condition: string
      note?: string | null
      imageUrl?: string | null
    }>,
    version: number,
  ) {
    const payload = {
      version,
      note: note ?? null,
      items: [...items]
        .sort((a, b) => a.roomAssetId - b.roomAssetId)
        .map(({ roomAssetId, expectedQuantity, actualQuantity, condition, note: itemNote, imageUrl }) => ({
          roomAssetId,
          expectedQuantity,
          actualQuantity,
          condition,
          note: itemNote ?? null,
          imageUrl: imageUrl ?? null,
        })),
    }
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
  }

  private where(query: TListHandoversQuery, tenantId?: number) {
    return {
      ...(tenantId ? { tenantId } : {}),
      ...(query.contractId ? { contractId: query.contractId } : {}),
      ...(query.roomId ? { roomId: query.roomId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
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
      this.logger.error(error instanceof Error ? error.message : 'Không thể gửi thông báo bàn giao')
    }
  }
}
