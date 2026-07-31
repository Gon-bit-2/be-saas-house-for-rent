export const OCR_QUEUE = 'ocr'
export const PROCESS_OCR_JOB = 'PROCESS_OCR_JOB'

export type ProcessOcrJobData = {
  ocrJobId: number
  backgroundJobId: number
}
