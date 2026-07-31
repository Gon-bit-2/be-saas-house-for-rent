import { Injectable } from '@nestjs/common'
import { ImageAnnotatorClient } from '@google-cloud/vision'
import type { OcrCandidate, OcrProvider, OcrRecognition } from './ocr.provider'

type VisionWord = {
  confidence?: number | null
  symbols?: Array<{ text?: string | null; confidence?: number | null }> | null
}

@Injectable()
export class GoogleVisionOcrProvider implements OcrProvider {
  private readonly client = new ImageAnnotatorClient()

  async recognize(imageUrl: string): Promise<OcrRecognition> {
    const [response] = await this.client.documentTextDetection({ image: { source: { imageUri: imageUrl } } })
    if (response.error?.message) {
      throw new Error('OCR_PROVIDER_ERROR')
    }

    const annotation = response.fullTextAnnotation
    const words: VisionWord[] = []
    for (const page of annotation?.pages ?? []) {
      for (const block of page.blocks ?? []) {
        for (const paragraph of block.paragraphs ?? []) {
          words.push(...((paragraph.words ?? []) as VisionWord[]))
        }
      }
    }

    return {
      text: (annotation?.text ?? '').slice(0, 5_000),
      candidates: this.extractCandidates(words),
    }
  }

  private extractCandidates(words: VisionWord[]) {
    const candidates = new Map<string, OcrCandidate>()
    for (const word of words) {
      const text = (word.symbols ?? []).map((symbol) => symbol.text ?? '').join('')
      const value = this.parseValue(text)
      if (!value) continue

      const confidence = this.confidence(word)
      const current = candidates.get(value)
      if (!current || confidence > current.confidence) {
        candidates.set(value, { text, value, confidence })
      }
    }

    return [...candidates.values()].sort((left, right) => right.confidence - left.confidence).slice(0, 20)
  }

  private parseValue(text: string) {
    const normalized = text.trim().replace(/\s+/g, '').replace(',', '.')
    if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(normalized)) return null

    const value = Number(normalized)
    if (!Number.isFinite(value) || value < 0 || value > 9_999_999_999.99) return null
    return normalized
  }

  private confidence(word: VisionWord) {
    if (typeof word.confidence === 'number') return this.clamp(word.confidence)
    const values = (word.symbols ?? [])
      .map((symbol) => symbol.confidence)
      .filter((value): value is number => typeof value === 'number')
    if (values.length === 0) return 0
    return this.clamp(values.reduce((sum, value) => sum + value, 0) / values.length)
  }

  private clamp(value: number) {
    return Math.min(1, Math.max(0, value))
  }
}
