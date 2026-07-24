import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import { TenantAccessService } from '@src/shared/modules/services/tenant-access.service'
import type { Prisma } from 'generated/prisma/client'
import type {
  TCreateMeterReadingBodySchema,
  TListMeterReadingsQuerySchema,
  TUpdateMeterReadingBodySchema,
  TUpdateMeterReadingStatusBodySchema,
} from './model/utility-meters.model'
import { UtilityMetersRepository } from './repositories/utility-meters.repo'

/**
 * Service for manual meter reading entry and validation.
 */
@Injectable()
export class MeterReadingsService {
  constructor(
    private readonly utilityMetersRepository: UtilityMetersRepository,
    private readonly tenantAccessService: TenantAccessService,
  ) {}

  async list(userId: number, query: TListMeterReadingsQuerySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const { page, limit, skip } = normalizePagination(query)
    const where = this.buildListWhere(tenant.tenantId, query)
    const [readings, total] = await this.utilityMetersRepository.findReadingsAndCount(where, skip, limit)
    return buildPaginatedResult(readings, total, page, limit)
  }

  async getById(userId: number, id: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    return this.getTenantReadingOrThrow(tenant.tenantId, id)
  }

  async create(userId: number, body: TCreateMeterReadingBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const meter = await this.utilityMetersRepository.findMeterForReading(tenant.tenantId, body.meterId)
    if (!meter) {
      throw new NotFoundException('Không tìm thấy đồng hồ trong tenant hiện tại')
    }
    if (meter.status !== 'ACTIVE') {
      throw new BadRequestException('Chỉ đồng hồ đang hoạt động mới được ghi chỉ số')
    }

    const billingMonth = this.normalizeBillingMonth(body.billingMonth)
    const existingReading = await this.utilityMetersRepository.findReadingByMeterMonth(body.meterId, billingMonth)
    if (existingReading) {
      throw new ConflictException('Đồng hồ đã có chỉ số cho kỳ này')
    }

    const latestReading = await this.utilityMetersRepository.findLatestReadingBeforeMonth(body.meterId, billingMonth)
    const previousValue = body.previousValue ?? this.toNumber(latestReading?.currentValue ?? 0)
    const unitPrice = body.unitPrice ?? this.defaultUnitPriceForMeter(meter)
    const computed = this.computeReading(previousValue, body.currentValue, unitPrice)
    const contract = await this.utilityMetersRepository.findActiveContractForRoomMonth(
      tenant.tenantId,
      meter.roomId,
      billingMonth,
    )

    return this.utilityMetersRepository.createManualReading({
      tenantId: tenant.tenantId,
      roomId: meter.roomId,
      meterId: body.meterId,
      contractId: contract?.id ?? null,
      billingMonth,
      previousValue,
      currentValue: body.currentValue,
      consumption: computed.consumption,
      unitPrice,
      amount: computed.amount,
      imageUrl: body.imageUrl ?? null,
      source: 'MANUAL',
      status: body.status,
      createdById: userId,
      updatedById: userId,
    })
  }

  async update(userId: number, id: number, body: TUpdateMeterReadingBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const reading = await this.getTenantReadingOrThrow(tenant.tenantId, id)
    this.assertReadingEditable(reading)

    const previousValue = body.previousValue ?? this.toNumber(reading.previousValue)
    const currentValue = body.currentValue ?? this.toNumber(reading.currentValue)
    const unitPrice = body.unitPrice ?? this.toNumber(reading.unitPrice)
    const computed = this.computeReading(previousValue, currentValue, unitPrice)

    return this.utilityMetersRepository.updateReading(id, {
      previousValue,
      currentValue,
      unitPrice,
      consumption: computed.consumption,
      amount: computed.amount,
      imageUrl: body.imageUrl === undefined ? undefined : (body.imageUrl ?? null),
      updatedById: userId,
    })
  }

  async updateStatus(userId: number, id: number, body: TUpdateMeterReadingStatusBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const reading = await this.getTenantReadingOrThrow(tenant.tenantId, id)
    if (reading._count.invoiceItems > 0) {
      throw new BadRequestException('Chỉ số đã được dùng cho hóa đơn, không thể đổi trạng thái')
    }
    return this.utilityMetersRepository.updateReadingStatus(id, body.status, userId)
  }

  private async getTenantReadingOrThrow(tenantId: number, id: number) {
    const reading = await this.utilityMetersRepository.findTenantReading(tenantId, id)
    if (!reading) {
      throw new NotFoundException('Không tìm thấy chỉ số trong tenant hiện tại')
    }
    return reading
  }

  private assertReadingEditable(reading: { status: string; _count: { invoiceItems: number } }) {
    if (reading.status === 'CONFIRMED') {
      throw new BadRequestException('Không thể sửa chỉ số đã xác nhận')
    }
    if (reading._count.invoiceItems > 0) {
      throw new BadRequestException('Chỉ số đã được dùng cho hóa đơn, không thể sửa')
    }
  }

  /**
   * Computes consumption and amount from numeric meter values.
   */
  private computeReading(previousValue: number, currentValue: number, unitPrice: number) {
    if (currentValue < previousValue) {
      throw new BadRequestException('Chỉ số mới không được nhỏ hơn chỉ số cũ')
    }
    const consumption = currentValue - previousValue
    return { consumption, amount: consumption * unitPrice }
  }

  private defaultUnitPriceForMeter(meter: {
    type: 'ELECTRICITY' | 'WATER'
    room: { electricityPrice: unknown; waterPrice: unknown }
  }) {
    return meter.type === 'ELECTRICITY' ? this.toNumber(meter.room.electricityPrice) : this.toNumber(meter.room.waterPrice)
  }

  private normalizeBillingMonth(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
  }

  private toNumber(value: unknown) {
    return Number(value)
  }

  private buildListWhere(tenantId: number, query: TListMeterReadingsQuerySchema): Prisma.MeterReadingWhereInput {
    const billingMonth = query.billingMonth ? this.normalizeBillingMonth(query.billingMonth) : undefined
    const from = query.from ? this.normalizeBillingMonth(query.from) : undefined
    const to = query.to ? this.normalizeBillingMonth(query.to) : undefined

    return {
      tenantId,
      ...(billingMonth ? { billingMonth } : {}),
      ...(!billingMonth && (from || to)
        ? { billingMonth: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {}),
      ...(query.roomId ? { roomId: query.roomId } : {}),
      ...(query.meterId ? { meterId: query.meterId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { meter: { type: query.type } } : {}),
    }
  }
}
