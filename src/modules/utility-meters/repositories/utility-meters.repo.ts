import { Injectable } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import type { Prisma } from 'generated/prisma/client'

export const utilityMeterSelect = {
  id: true,
  tenantId: true,
  roomId: true,
  type: true,
  meterCode: true,
  unit: true,
  status: true,
  createdAt: true,
  room: {
    select: {
      id: true,
      roomCode: true,
      title: true,
      electricityPrice: true,
      waterPrice: true,
      property: { select: { id: true, name: true, province: true, district: true, ward: true } },
    },
  },
  readings: {
    orderBy: [{ billingMonth: 'desc' }, { id: 'desc' }],
    take: 1,
    select: {
      id: true,
      billingMonth: true,
      previousValue: true,
      currentValue: true,
      consumption: true,
      unitPrice: true,
      amount: true,
      status: true,
      recordedAt: true,
    },
  },
} satisfies Prisma.UtilityMeterSelect

export const meterReadingSelect = {
  id: true,
  tenantId: true,
  roomId: true,
  meterId: true,
  contractId: true,
  billingMonth: true,
  previousValue: true,
  currentValue: true,
  consumption: true,
  unitPrice: true,
  amount: true,
  imageUrl: true,
  source: true,
  status: true,
  recordedAt: true,
  createdById: true,
  updatedById: true,
  meter: { select: { id: true, type: true, meterCode: true, unit: true, status: true } },
  room: {
    select: {
      id: true,
      roomCode: true,
      title: true,
      property: { select: { id: true, name: true, province: true, district: true, ward: true } },
    },
  },
  contract: { select: { id: true, contractCode: true, status: true, startDate: true, endDate: true } },
  _count: { select: { invoiceItems: true } },
} satisfies Prisma.MeterReadingSelect

/**
 * Repository for tenant-scoped utility meters and manual meter readings.
 */
@Injectable()
export class UtilityMetersRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findMetersAndCount(where: Prisma.UtilityMeterWhereInput, skip: number, take: number) {
    return this.prismaService.$transaction([
      this.prismaService.utilityMeter.findMany({ where, skip, take, orderBy: [{ createdAt: 'desc' }], select: utilityMeterSelect }),
      this.prismaService.utilityMeter.count({ where }),
    ])
  }

  async findTenantMeter(tenantId: number, id: number) {
    return this.prismaService.utilityMeter.findFirst({ where: { id, tenantId }, select: utilityMeterSelect })
  }

  async findRoomForMeter(tenantId: number, roomId: number) {
    return this.prismaService.room.findFirst({
      where: { id: roomId, tenantId, deletedAt: null },
      select: { id: true, tenantId: true, electricityPrice: true, waterPrice: true },
    })
  }

  async findMeterByRoomType(roomId: number, type: 'ELECTRICITY' | 'WATER', excludedMeterId?: number) {
    return this.prismaService.utilityMeter.findFirst({
      where: { roomId, type, ...(excludedMeterId ? { id: { not: excludedMeterId } } : {}) },
      select: { id: true },
    })
  }

  async createMeter(data: Prisma.UtilityMeterUncheckedCreateInput) {
    return this.prismaService.utilityMeter.create({ data, select: utilityMeterSelect })
  }

  async updateMeter(id: number, data: Prisma.UtilityMeterUncheckedUpdateInput) {
    return this.prismaService.utilityMeter.update({ where: { id }, data, select: utilityMeterSelect })
  }

  async findReadingsAndCount(where: Prisma.MeterReadingWhereInput, skip: number, take: number) {
    return this.prismaService.$transaction([
      this.prismaService.meterReading.findMany({
        where,
        skip,
        take,
        orderBy: [{ billingMonth: 'desc' }, { recordedAt: 'desc' }],
        select: meterReadingSelect,
      }),
      this.prismaService.meterReading.count({ where }),
    ])
  }

  async findTenantReading(tenantId: number, id: number) {
    return this.prismaService.meterReading.findFirst({ where: { id, tenantId }, select: meterReadingSelect })
  }

  async findMeterForReading(tenantId: number, meterId: number) {
    return this.prismaService.utilityMeter.findFirst({
      where: { id: meterId, tenantId, room: { deletedAt: null } },
      select: {
        id: true,
        tenantId: true,
        roomId: true,
        type: true,
        status: true,
        room: { select: { id: true, electricityPrice: true, waterPrice: true } },
      },
    })
  }

  async findReadingByMeterMonth(meterId: number, billingMonth: Date) {
    return this.prismaService.meterReading.findFirst({ where: { meterId, billingMonth }, select: { id: true } })
  }

  async findLatestReadingBeforeMonth(meterId: number, billingMonth: Date) {
    return this.prismaService.meterReading.findFirst({
      where: { meterId, billingMonth: { lt: billingMonth }, status: { not: 'REJECTED' } },
      orderBy: [{ billingMonth: 'desc' }, { id: 'desc' }],
      select: { id: true, currentValue: true, billingMonth: true },
    })
  }

  async findActiveContractForRoomMonth(tenantId: number, roomId: number, billingMonth: Date) {
    return this.prismaService.contract.findFirst({
      where: {
        tenantId,
        roomId,
        status: 'ACTIVE',
        deletedAt: null,
        startDate: { lte: billingMonth },
        endDate: { gte: billingMonth },
      },
      orderBy: { startDate: 'desc' },
      select: { id: true },
    })
  }

  /**
   * Creates a manual meter reading with computed consumption and amount.
   */
  async createManualReading(data: Prisma.MeterReadingUncheckedCreateInput) {
    return this.prismaService.meterReading.create({ data, select: meterReadingSelect })
  }

  async updateReading(id: number, data: Prisma.MeterReadingUncheckedUpdateInput) {
    return this.prismaService.meterReading.update({ where: { id }, data, select: meterReadingSelect })
  }

  async updateReadingStatus(id: number, status: 'DRAFT' | 'CONFIRMED' | 'ABNORMAL' | 'REJECTED', actorId: number) {
    return this.prismaService.meterReading.update({
      where: { id },
      data: { status, updatedById: actorId },
      select: meterReadingSelect,
    })
  }
}
