import { OcrProcessor } from './ocr.processor'

jest.mock('./repositories/ocr.repo', () => ({ OcrRepository: class OcrRepository {} }))

describe('OcrProcessor', () => {
  let repository: Record<string, jest.Mock>
  let provider: Record<string, jest.Mock>
  let processor: import('./ocr.processor').OcrProcessor

  const buildJob = (attemptsMade = 0, attempts = 5) =>
    ({
      name: 'PROCESS_OCR_JOB',
      data: { ocrJobId: 7, backgroundJobId: 9 },
      attemptsMade,
      opts: { attempts },
    }) as never

  beforeEach(() => {
    repository = {
      updateBackground: jest.fn(),
      findForProcess: jest
        .fn()
        .mockResolvedValue({ id: 7, imageUrl: 'https://example.com/meter.jpg', status: 'PENDING' }),
      update: jest.fn(),
    }
    provider = { recognize: jest.fn() }
    processor = new OcrProcessor(repository as never, provider as never)
  })

  it('marks one high-confidence numeric candidate as success', async () => {
    provider.recognize.mockResolvedValue({
      provider: 'TESSERACT_JS',
      text: '123.4',
      candidates: [{ text: '123.4', value: '123.4', confidence: 0.95 }],
    })
    await processor.process(buildJob())

    expect(repository.update).toHaveBeenLastCalledWith(
      7,
      expect.objectContaining({
        status: 'SUCCESS',
        recognizedValue: '123.4',
        confidence: 0.95,
        rawResult: {
          provider: 'TESSERACT_JS',
          text: '123.4',
          candidates: [{ text: '123.4', value: '123.4', confidence: 0.95 }],
        },
      }),
    )
    expect(repository.updateBackground).toHaveBeenLastCalledWith(9, 'COMPLETED', {
      attempts: 1,
      errorMessage: null,
    })
  })

  it('requires review for multiple candidates', async () => {
    provider.recognize.mockResolvedValue({
      text: '123 456',
      candidates: [
        { text: '123', value: '123', confidence: 0.99 },
        { text: '456', value: '456', confidence: 0.98 },
      ],
    })
    await processor.process(buildJob())
    expect(repository.update).toHaveBeenLastCalledWith(7, expect.objectContaining({ status: 'NEED_REVIEW' }))
  })

  it('marks the OCR job failed only after the final provider attempt', async () => {
    provider.recognize.mockRejectedValue(new Error('secret provider error'))
    await expect(processor.process(buildJob(4, 5))).rejects.toThrow('OCR_PROVIDER_ERROR')
    expect(repository.update).toHaveBeenLastCalledWith(
      7,
      expect.objectContaining({ status: 'FAILED', errorMessage: 'Không thể xử lý ảnh OCR' }),
    )
    expect(repository.updateBackground).toHaveBeenLastCalledWith(
      9,
      'FAILED',
      expect.objectContaining({ errorMessage: 'OCR_PROVIDER_ERROR' }),
    )
  })
})
