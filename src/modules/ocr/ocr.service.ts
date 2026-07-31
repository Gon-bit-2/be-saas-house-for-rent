import { InjectQueue } from '@nestjs/bullmq'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import { CloudinaryService } from '@src/shared/modules/services/cloudinary.service'
import { TenantAccessService } from '@src/shared/modules/services/tenant-access.service'
import { MeterReadingsService } from '@src/modules/utility-meters/meter-readings.service'
import { createHash } from 'crypto'
import type { Queue } from 'bullmq'
import type { Prisma } from 'generated/prisma/client'
import { OCR_QUEUE, PROCESS_OCR_JOB, type ProcessOcrJobData } from './ocr.constants'
import type { TAcceptOcrJobBodySchema, TCreateOcrJobBodySchema, TListOcrJobsQuerySchema } from './model/ocr.model'
import { OcrRepository } from './repositories/ocr.repo'

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name)

  constructor(
    private readonly repository: OcrRepository,
    private readonly tenantAccessService: TenantAccessService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly meterReadingsService: MeterReadingsService,
    @InjectQueue(OCR_QUEUE) private readonly queue: Queue<ProcessOcrJobData>,
  ) {}

  async list(userId: number, query: TListOcrJobsQuerySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const { page, limit, skip } = normalizePagination(query)
    const where: Prisma.OcrJobWhereInput = {
      tenantId: tenant.tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.roomId ? { roomId: query.roomId } : {}),
      ...(query.meterId ? { meterId: query.meterId } : {}),
      ...(query.from || query.to
        ? { createdAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
        : {}),
    }
    const [jobs, total] = await this.repository.list(where, skip, limit)
    return buildPaginatedResult(jobs, total, page, limit)
  }

  async getById(userId: number, id: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    return this.getOrThrow(tenant.tenantId, id)
  }

  async create(userId: number, body: TCreateOcrJobBodySchema, file?: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestException('Vui lòng chọn một ảnh công tơ')

    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    await this.assertEnabled(tenant.tenantId)
    const meter = await this.repository.findMeter(tenant.tenantId, body.meterId)
    if (!meter) throw new NotFoundException('Không tìm thấy đồng hồ trong tenant hiện tại')
    if (meter.status !== 'ACTIVE') throw new BadRequestException('Chỉ đồng hồ đang hoạt động mới được OCR')

    const fileHash = createHash('sha256').update(file.buffer).digest('hex')
    const existing = await this.repository.findByHash(tenant.tenantId, meter.id, fileHash)
    if (existing) return existing

    const image = await this.cloudinaryService.uploadImage(file, `ocr/${tenant.tenantId}/${meter.id}`)
    let created: Awaited<ReturnType<OcrRepository['create']>>
    try {
      created = await this.repository.create({
        tenantId: tenant.tenantId,
        roomId: meter.roomId,
        meterId: meter.id,
        uploadedBy: userId,
        imageUrl: image.url,
        imagePublicId: image.publicId,
        fileHash,
        status: 'PENDING',
      })
    } catch (error) {
      await this.cloudinaryService.deleteImage(image.publicId).catch(() => undefined)
      if (this.isPrismaError(error, 'P2002')) {
        const concurrent = await this.repository.findByHash(tenant.tenantId, meter.id, fileHash)
        if (concurrent) return concurrent
      }
      throw error
    }

    try {
      await this.enqueue(created.job.id, created.backgroundJobId)
      return created.job
    } catch {
      await this.repository.remove(created.job.id, created.backgroundJobId).catch(() => undefined)
      await this.cloudinaryService.deleteImage(image.publicId).catch(() => undefined)
      throw new ServiceUnavailableException('Không thể tạo tác vụ OCR lúc này')
    }
  }

  async retry(userId: number, id: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    await this.assertEnabled(tenant.tenantId)
    const job = await this.getOrThrow(tenant.tenantId, id)
    if (job.status !== 'FAILED') throw new BadRequestException('Chỉ tác vụ OCR thất bại mới được thử lại')

    const retried = await this.repository.retry(tenant.tenantId, id)
    try {
      await this.enqueue(retried.job.id, retried.backgroundJobId)
      return retried.job
    } catch {
      await this.repository.update(id, { status: 'FAILED', errorMessage: 'Không thể đưa tác vụ vào hàng đợi' })
      await this.repository.updateBackground(retried.backgroundJobId, 'FAILED', {
        errorMessage: 'OCR_QUEUE_UNAVAILABLE',
      })
      throw new ServiceUnavailableException('Không thể thử lại tác vụ OCR lúc này')
    }
  }

  async accept(userId: number, id: number, body: TAcceptOcrJobBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const job = await this.getOrThrow(tenant.tenantId, id)
    if (job.reading) {
      return this.repository.findReading(tenant.tenantId, id)
    }
    if (!['SUCCESS', 'NEED_REVIEW'].includes(job.status)) {
      throw new BadRequestException('Tác vụ OCR chưa có kết quả để duyệt')
    }

    const recognizedValue = job.recognizedValue === null ? undefined : Number(job.recognizedValue)
    const currentValue = body.currentValue ?? recognizedValue
    if (currentValue === undefined) {
      throw new BadRequestException('Vui lòng nhập chỉ số công tơ sau khi kiểm tra ảnh')
    }

    let reading: Awaited<ReturnType<MeterReadingsService['prepare']>>
    try {
      reading = await this.meterReadingsService.prepare(tenant.tenantId, {
        meterId: job.meterId,
        billingMonth: body.billingMonth,
        currentValue,
        previousValue: body.previousValue,
        unitPrice: body.unitPrice,
      })
    } catch (error) {
      if (error instanceof ConflictException) {
        const concurrent = await this.repository.findReading(tenant.tenantId, id)
        if (concurrent) return concurrent
      }
      throw error
    }

    try {
      const accepted = await this.repository.accept(tenant.tenantId, id, {
        ...reading,
        imageUrl: job.imageUrl,
        source: 'OCR',
        status: 'DRAFT',
        createdById: userId,
        updatedById: userId,
      })
      if (!accepted) throw new NotFoundException('Không tìm thấy tác vụ OCR trong tenant hiện tại')
      return accepted
    } catch (error) {
      if (this.isPrismaError(error, 'P2002')) {
        const concurrent = await this.repository.findReading(tenant.tenantId, id)
        if (concurrent) return concurrent
        throw new ConflictException('Đồng hồ đã có chỉ số cho kỳ này')
      }
      throw error
    }
  }

  private async assertEnabled(tenantId: number) {
    if (!(await this.repository.isEnabled(tenantId, new Date()))) {
      throw new ForbiddenException('Gói dịch vụ hiện tại không hỗ trợ AI OCR')
    }
  }

  private async getOrThrow(tenantId: number, id: number) {
    const job = await this.repository.findById(tenantId, id)
    if (!job) throw new NotFoundException('Không tìm thấy tác vụ OCR trong tenant hiện tại')
    return job
  }

  private async enqueue(ocrJobId: number, backgroundJobId: number) {
    const queued = await this.queue.add(
      PROCESS_OCR_JOB,
      { ocrJobId, backgroundJobId },
      { jobId: `ocr-${backgroundJobId}` },
    )
    try {
      await this.repository.setBackgroundExternalId(backgroundJobId, String(queued.id))
    } catch {
      this.logger.warn(`ocr_background_job_external_id_failed id=${backgroundJobId}`)
    }
  }

  private isPrismaError(error: unknown, code: string) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === code
  }
}
