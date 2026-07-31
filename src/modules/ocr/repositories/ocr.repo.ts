import { Injectable } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import type { BackgroundJobStatus, Prisma } from 'generated/prisma/client'
import { meterReadingSelect } from '@src/modules/utility-meters/repositories/utility-meters.repo'

export const ocrJobSelect = {
  id: true,
  tenantId: true,
  roomId: true,
  meterId: true,
  uploadedBy: true,
  imageUrl: true,
  recognizedValue: true,
  confidence: true,
  status: true,
  errorMessage: true,
  createdAt: true,
  processedAt: true,
  meter: { select: { id: true, type: true, meterCode: true, unit: true, status: true } },
  room: { select: { id: true, roomCode: true, title: true } },
  reading: { select: { id: true, billingMonth: true, currentValue: true, status: true } },
} satisfies Prisma.OcrJobSelect

@Injectable()
export class OcrRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async list(where: Prisma.OcrJobWhereInput, skip: number, take: number) {
    return this.prismaService.$transaction([
      this.prismaService.ocrJob.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: ocrJobSelect,
      }),
      this.prismaService.ocrJob.count({ where }),
    ])
  }

  findById(tenantId: number, id: number) {
    return this.prismaService.ocrJob.findFirst({ where: { id, tenantId }, select: ocrJobSelect })
  }

  findByHash(tenantId: number, meterId: number, fileHash: string) {
    return this.prismaService.ocrJob.findFirst({ where: { tenantId, meterId, fileHash }, select: ocrJobSelect })
  }

  findReading(tenantId: number, ocrJobId: number) {
    return this.prismaService.meterReading.findFirst({ where: { tenantId, ocrJobId }, select: meterReadingSelect })
  }

  findMeter(tenantId: number, meterId: number) {
    return this.prismaService.utilityMeter.findFirst({
      where: { id: meterId, tenantId, room: { deletedAt: null } },
      select: { id: true, roomId: true, status: true },
    })
  }

  async isEnabled(tenantId: number, now: Date) {
    const subscription = await this.prismaService.subscription.findFirst({
      where: {
        tenantId,
        status: 'ACTIVE',
        startedAt: { lte: now },
        expiredAt: { gt: now },
        plan: { allowAiOcr: true },
      },
      select: { id: true },
    })
    return Boolean(subscription)
  }

  async create(data: Prisma.OcrJobUncheckedCreateInput) {
    return this.prismaService.$transaction(async (tx) => {
      const job = await tx.ocrJob.create({ data, select: ocrJobSelect })
      const background = await tx.backgroundJob.create({
        data: {
          tenantId: data.tenantId,
          queueName: 'ocr',
          jobType: 'PROCESS_OCR_JOB',
          payload: { ocrJobId: job.id },
          status: 'WAITING',
        },
        select: { id: true },
      })
      return { job, backgroundJobId: background.id }
    })
  }

  update(id: number, data: Prisma.OcrJobUncheckedUpdateInput) {
    return this.prismaService.ocrJob.update({ where: { id }, data, select: ocrJobSelect })
  }

  async retry(tenantId: number, id: number) {
    return this.prismaService.$transaction(async (tx) => {
      const job = await tx.ocrJob.update({
        where: { id, tenantId },
        data: { status: 'PENDING', errorMessage: null, processedAt: null },
        select: ocrJobSelect,
      })
      const background = await tx.backgroundJob.create({
        data: {
          tenantId,
          queueName: 'ocr',
          jobType: 'PROCESS_OCR_JOB',
          payload: { ocrJobId: id },
          status: 'WAITING',
        },
        select: { id: true },
      })
      return { job, backgroundJobId: background.id }
    })
  }

  async accept(tenantId: number, jobId: number, data: Prisma.MeterReadingUncheckedCreateInput) {
    return this.prismaService.$transaction(async (tx) => {
      const job = await tx.ocrJob.findFirst({
        where: { id: jobId, tenantId },
        select: { id: true, reading: { select: { id: true } } },
      })
      if (!job) return null
      if (job.reading) {
        return tx.meterReading.findUnique({ where: { id: job.reading.id }, select: meterReadingSelect })
      }
      return tx.meterReading.create({ data: { ...data, ocrJobId: jobId }, select: meterReadingSelect })
    })
  }

  async remove(id: number, backgroundJobId: number) {
    await this.prismaService.$transaction([
      this.prismaService.backgroundJob.delete({ where: { id: backgroundJobId } }),
      this.prismaService.ocrJob.delete({ where: { id } }),
    ])
  }

  findForProcess(id: number) {
    return this.prismaService.ocrJob.findUnique({
      where: { id },
      select: { id: true, imageUrl: true, status: true },
    })
  }

  setBackgroundExternalId(id: number, externalJobId: string) {
    return this.prismaService.backgroundJob.update({ where: { id }, data: { externalJobId }, select: { id: true } })
  }

  updateBackground(
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
}
