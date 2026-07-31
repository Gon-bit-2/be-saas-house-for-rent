import { Inject, Injectable, Logger } from '@nestjs/common'
import { Processor, WorkerHost } from '@nestjs/bullmq'
import envConfig from '@src/config/env.config'
import type { Job } from 'bullmq'
import { OCR_QUEUE, PROCESS_OCR_JOB, type ProcessOcrJobData } from './ocr.constants'
import { OCR_PROVIDER, type OcrProvider } from './providers/ocr.provider'
import { OcrRepository } from './repositories/ocr.repo'

@Injectable()
@Processor(OCR_QUEUE)
export class OcrProcessor extends WorkerHost {
  private readonly logger = new Logger(OcrProcessor.name)

  constructor(
    private readonly repository: OcrRepository,
    @Inject(OCR_PROVIDER) private readonly provider: OcrProvider,
  ) {
    super()
  }

  async process(job: Job<ProcessOcrJobData>) {
    if (job.name !== PROCESS_OCR_JOB) return

    const attempts = job.attemptsMade + 1
    await this.repository.updateBackground(job.data.backgroundJobId, 'ACTIVE', { attempts })
    const ocrJob = await this.repository.findForProcess(job.data.ocrJobId)
    if (!ocrJob || !['PENDING', 'PROCESSING'].includes(ocrJob.status)) {
      await this.repository.updateBackground(job.data.backgroundJobId, 'COMPLETED', { attempts })
      return
    }

    await this.repository.update(ocrJob.id, { status: 'PROCESSING', errorMessage: null })

    try {
      const result = await this.provider.recognize(ocrJob.imageUrl)
      const selected = result.candidates[0]
      const status =
        result.candidates.length === 1 && selected.confidence >= envConfig.OCR_CONFIDENCE_THRESHOLD
          ? 'SUCCESS'
          : 'NEED_REVIEW'

      await this.repository.update(ocrJob.id, {
        status,
        recognizedValue: selected?.value ?? null,
        confidence: selected?.confidence ?? null,
        rawResult: {
          provider: result.provider ?? 'GOOGLE_CLOUD_VISION',
          text: result.text,
          candidates: result.candidates,
        },
        errorMessage: null,
        processedAt: new Date(),
      })
      await this.repository.updateBackground(job.data.backgroundJobId, 'COMPLETED', { attempts, errorMessage: null })
    } catch {
      const maxAttempts = typeof job.opts.attempts === 'number' ? job.opts.attempts : 1
      const isFinalAttempt = attempts >= maxAttempts
      await this.repository.updateBackground(job.data.backgroundJobId, isFinalAttempt ? 'FAILED' : 'RETRYING', {
        attempts,
        errorMessage: 'OCR_PROVIDER_ERROR',
      })
      if (isFinalAttempt) {
        await this.repository.update(ocrJob.id, {
          status: 'FAILED',
          errorMessage: 'Không thể xử lý ảnh OCR',
          processedAt: new Date(),
        })
      }
      this.logger.warn(`ocr_job_failed id=${ocrJob.id} attempt=${attempts}`)
      throw new Error('OCR_PROVIDER_ERROR')
    }
  }
}
