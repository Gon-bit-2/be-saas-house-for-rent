import { Injectable, type OnModuleDestroy } from '@nestjs/common'
import envConfig from '@src/config/env.config'
import eng from '@tesseract.js-data/eng'
import sharp from 'sharp'
import { createWorker, OEM, PSM, type Block, type Worker } from 'tesseract.js'
import type { OcrCandidate, OcrProvider, OcrRecognition } from './ocr.provider'

const DOWNLOAD_TIMEOUT_MS = 10_000
const OUTPUT_SIZE = 2_000

@Injectable()
export class TesseractOcrProvider implements OcrProvider, OnModuleDestroy {
  private workerPromise?: Promise<Worker>
  private pending: Promise<void> = Promise.resolve()
  private stopped = false

  recognize(imageUrl: string): Promise<OcrRecognition> {
    if (this.stopped) return Promise.reject(new Error('OCR_PROVIDER_ERROR'))

    const task = this.pending.then(() => this.run(imageUrl))
    this.pending = task.then(
      () => undefined,
      () => undefined,
    )
    return task
  }

  async onModuleDestroy() {
    this.stopped = true
    await this.pending
    await this.resetWorker()
  }

  private async run(imageUrl: string): Promise<OcrRecognition> {
    try {
      const image = await this.loadImage(imageUrl)
      const prepared = await this.prepareImage(image)
      const worker = await this.getWorker()
      const { data } = await worker.recognize(prepared, {}, { text: true, blocks: true })
      return {
        provider: 'TESSERACT_JS',
        text: data.text.slice(0, 5_000),
        candidates: this.extractCandidates(data.blocks),
      }
    } catch (error) {
      console.error('Lỗi chi tiết trong TesseractProvider:', error)
      await this.resetWorker()
      throw new Error('OCR_PROVIDER_ERROR')
    }
  }

  private async loadImage(imageUrl: string) {
    let url: URL
    try {
      url = new URL(imageUrl)
    } catch {
      throw new Error('OCR_PROVIDER_ERROR')
    }
    if (url.protocol !== 'https:') throw new Error('OCR_PROVIDER_ERROR')

    let response: Response
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
    } catch {
      throw new Error('OCR_PROVIDER_ERROR')
    }
    if (!response.ok || !response.body) throw new Error('OCR_PROVIDER_ERROR')

    const declaredSize = Number(response.headers.get('content-length'))
    if (Number.isFinite(declaredSize) && declaredSize > envConfig.OCR_UPLOAD_MAX_BYTES) {
      throw new Error('OCR_PROVIDER_ERROR')
    }

    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > envConfig.OCR_UPLOAD_MAX_BYTES) {
        await reader.cancel()
        throw new Error('OCR_PROVIDER_ERROR')
      }
      chunks.push(value)
    }
    if (size === 0) throw new Error('OCR_PROVIDER_ERROR')
    return Buffer.concat(chunks, size)
  }

  private prepareImage(image: Buffer) {
    return sharp(image, { failOn: 'error', limitInputPixels: 40_000_000 })
      .rotate()
      .grayscale()
      .normalize()
      .sharpen()
      .resize({
        width: OUTPUT_SIZE,
        height: OUTPUT_SIZE,
        fit: 'inside',
        withoutEnlargement: false,
      })
      .png()
      .toBuffer()
  }

  private getWorker() {
    this.workerPromise ??= this.createWorker()
    return this.workerPromise
  }

  private async createWorker() {
    let worker: Worker | undefined
    try {
      worker = await createWorker(eng.code, OEM.LSTM_ONLY, {
        langPath: eng.langPath,
        gzip: eng.gzip,
        cacheMethod: 'none',
      })
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
        tessedit_char_whitelist: '0123456789.,',
        preserve_interword_spaces: '1',
      })
      return worker
    } catch {
      await worker?.terminate().catch(() => undefined)
      throw new Error('OCR_PROVIDER_ERROR')
    }
  }

  private extractCandidates(blocks: Block[] | null) {
    const candidates = new Map<string, OcrCandidate>()

    const evaluate = (text: string, confidence: number) => {
      if (!text) return
      const value = this.parseValue(text)
      if (!value) return

      const normalizedConfidence = this.normalizeConfidence(confidence)
      const current = candidates.get(value)
      if (!current || normalizedConfidence > current.confidence) {
        candidates.set(value, { text, value, confidence: normalizedConfidence })
      }
    }

    for (const block of blocks ?? []) {
      for (const paragraph of block.paragraphs ?? []) {
        for (const line of paragraph.lines ?? []) {
          evaluate(line.text, line.confidence)
          for (const word of line.words ?? []) {
            evaluate(word.text, word.confidence)
          }
        }
      }
    }

    return [...candidates.values()].sort((left, right) => right.confidence - left.confidence).slice(0, 20)
  }

  private parseValue(text: string) {
    let normalized = text.trim().replace(/\s+/g, '').replace(',', '.')

    normalized = normalized
      .replace(/[Oo]/g, '0')
      .replace(/[Ss]/g, '5')
      .replace(/[Zz]/g, '2')
      .replace(/[Il]/g, '1')
      .replace(/[Bb]/g, '8')
      .replace(/[Gg]/g, '6')
      .replace(/[Qq]/g, '9')

    const match = normalized.match(/\d+(?:\.\d+)?/)
    if (!match) return null

    normalized = match[0]
    const value = Number(normalized)
    if (!Number.isFinite(value) || value < 0 || value > 9_999_999_999.99) return null
    return normalized
  }

  private normalizeConfidence(confidence: number) {
    return Math.min(1, Math.max(0, confidence / 100))
  }

  private async resetWorker() {
    const workerPromise = this.workerPromise
    this.workerPromise = undefined
    if (!workerPromise) return

    try {
      const worker = await workerPromise
      await worker.terminate()
    } catch {
      // Worker initialization or termination failure is already handled as an OCR provider error.
    }
  }
}
