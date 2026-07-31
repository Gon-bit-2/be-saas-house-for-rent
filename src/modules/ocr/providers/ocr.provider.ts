export const OCR_PROVIDER = Symbol('OCR_PROVIDER')

export type OcrCandidate = {
  text: string
  value: string
  confidence: number
}

export type OcrRecognition = {
  provider?: 'GOOGLE_CLOUD_VISION' | 'TESSERACT_JS'
  text: string
  candidates: OcrCandidate[]
}

export interface OcrProvider {
  recognize(imageUrl: string): Promise<OcrRecognition>
}
