import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import { TenantAccessService } from '@src/shared/modules/services/tenant-access.service'
import { Decimal } from '@prisma/client/runtime/client'
import type { Prisma } from 'generated/prisma/client'
import type {
  TCreateMeterReadingBodySchema,
  TListMeterReadingsQuerySchema,
  TUpdateMeterReadingBodySchema,
  TUpdateMeterReadingStatusBodySchema,
} from './model/utility-meters.model'
import { UtilityMetersRepository } from './repositories/utility-meters.repo'

export type PrepareMeterReadingInput = {
  meterId: number
  billingMonth: Date
  currentValue: number
  previousValue?: number
  unitPrice?: number
}

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
    const data = await this.prepare(tenant.tenantId, body)

    return this.utilityMetersRepository.createReading({
      ...data,
      imageUrl: body.imageUrl ?? null,
      source: 'MANUAL',
      status: body.status,
      createdById: userId,
      updatedById: userId,
    })
  }

  async prepare(tenantId: number, input: PrepareMeterReadingInput) {
    const meter = await this.utilityMetersRepository.findMeterForReading(tenantId, input.meterId)
    if (!meter) {
      throw new NotFoundException('Không tìm thấy đồng hồ trong tenant hiện tại')
    }
    if (meter.status !== 'ACTIVE') {
      throw new BadRequestException('Chỉ đồng hồ đang hoạt động mới được ghi chỉ số')
    }

    const billingMonth = this.normalizeBillingMonth(input.billingMonth)
    const existingReading = await this.utilityMetersRepository.findReadingByMeterMonth(input.meterId, billingMonth)
    if (existingReading) {
      throw new ConflictException('Đồng hồ đã có chỉ số cho kỳ này')
    }

    const latestReading = await this.utilityMetersRepository.findLatestReadingBeforeMonth(input.meterId, billingMonth)
    const previousValue = this.toDecimal(input.previousValue ?? latestReading?.currentValue ?? 0)
    const currentValue = this.toDecimal(input.currentValue)
    const unitPrice = this.toDecimal(input.unitPrice ?? this.defaultUnitPriceForMeter(meter))
    const computed = this.computeReading(previousValue, currentValue, unitPrice)
    const contract = await this.utilityMetersRepository.findActiveContractForRoomMonth(
      tenantId,
      meter.roomId,
      billingMonth,
    )

    return {
      tenantId,
      roomId: meter.roomId,
      meterId: input.meterId,
      contractId: contract?.id ?? null,
      billingMonth,
      previousValue,
      currentValue,
      consumption: computed.consumption,
      unitPrice,
      amount: computed.amount,
    } satisfies Prisma.MeterReadingUncheckedCreateInput
  }

  async update(userId: number, id: number, body: TUpdateMeterReadingBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const reading = await this.getTenantReadingOrThrow(tenant.tenantId, id)
    this.assertReadingEditable(reading)

    const previousValue = this.toDecimal(body.previousValue ?? reading.previousValue)
    const currentValue = this.toDecimal(body.currentValue ?? reading.currentValue)
    const unitPrice = this.toDecimal(body.unitPrice ?? reading.unitPrice)
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
  private computeReading(previousValue: Decimal, currentValue: Decimal, unitPrice: Decimal) {
    if (currentValue.lessThan(previousValue)) {
      throw new BadRequestException('Chỉ số mới không được nhỏ hơn chỉ số cũ')
    }
    const consumption = currentValue.minus(previousValue)
    return { consumption, amount: consumption.mul(unitPrice) }
  }

  private defaultUnitPriceForMeter(meter: {
    type: 'ELECTRICITY' | 'WATER'
    room: { electricityPrice: unknown; waterPrice: unknown }
  }) {
    return meter.type === 'ELECTRICITY' ? meter.room.electricityPrice : meter.room.waterPrice
  }

  private normalizeBillingMonth(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
  }

  private toDecimal(value: unknown) {
    return new Decimal(value as string | number | Decimal)
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
