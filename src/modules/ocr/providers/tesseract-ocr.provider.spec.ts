import sharp from 'sharp'
import { createWorker, OEM, PSM } from 'tesseract.js'
import { TesseractOcrProvider } from './tesseract-ocr.provider'

jest.mock('@tesseract.js-data/eng', () => ({
  __esModule: true,
  default: { code: 'eng', gzip: true, langPath: 'local-tessdata' },
}))
jest.mock('sharp', () => ({ __esModule: true, default: jest.fn() }))
jest.mock('tesseract.js', () => ({
  createWorker: jest.fn(),
  OEM: { LSTM_ONLY: 1 },
  PSM: { SINGLE_BLOCK: '6' },
}))

describe('TesseractOcrProvider', () => {
  const preparedImage = Buffer.from('prepared-image')
  const createWorkerMock = createWorker as jest.Mock
  const sharpMock = sharp as unknown as jest.Mock
  const fetchMock = jest.fn()

  let pipeline: Record<string, jest.Mock>
  let worker: Record<string, jest.Mock>
  let provider: TesseractOcrProvider

  const response = (body: Uint8Array = Uint8Array.from([1, 2, 3]), headers?: HeadersInit) =>
    new Response(body, { status: 200, headers })

  const result = (
    words: Array<{ text: string; confidence: number }>,
    text = words.map((word) => word.text).join(' '),
  ) => ({
    data: {
      text,
      blocks: [{ paragraphs: [{ lines: [{ words }] }] }],
    },
  })

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = fetchMock
    fetchMock.mockImplementation(() => Promise.resolve(response()))

    pipeline = {
      rotate: jest.fn(),
      grayscale: jest.fn(),
      normalize: jest.fn(),
      sharpen: jest.fn(),
      resize: jest.fn(),
      png: jest.fn(),
      toBuffer: jest.fn().mockResolvedValue(preparedImage),
    }
    for (const method of ['rotate', 'grayscale', 'normalize', 'sharpen', 'resize', 'png']) {
      pipeline[method].mockReturnValue(pipeline)
    }
    sharpMock.mockReturnValue(pipeline)

    worker = {
      setParameters: jest.fn().mockResolvedValue(undefined),
      recognize: jest.fn().mockResolvedValue(result([])),
      terminate: jest.fn().mockResolvedValue(undefined),
    }
    createWorkerMock.mockResolvedValue(worker)
    provider = new TesseractOcrProvider()
  })

  afterEach(async () => {
    await provider.onModuleDestroy()
  })

  it('preprocesses the image and returns sorted, normalized numeric candidates', async () => {
    worker.recognize.mockResolvedValue(
      result([
        { text: '00123,4', confidence: 90 },
        { text: '56', confidence: 80 },
        { text: '00123,4', confidence: 70 },
        { text: '-1', confidence: 99 },
        { text: '12345678901', confidence: 99 },
        { text: '12.345', confidence: 99 },
        { text: 'ABC', confidence: 99 },
      ]),
    )

    await expect(provider.recognize('https://res.cloudinary.com/demo/meter.jpg')).resolves.toEqual({
      provider: 'TESSERACT_JS',
      text: '00123,4 56 00123,4 -1 12345678901 12.345 ABC',
      candidates: [
        { text: '00123,4', value: '00123.4', confidence: 0.9 },
        { text: '56', value: '56', confidence: 0.8 },
      ],
    })

    expect(sharpMock).toHaveBeenCalledWith(Buffer.from([1, 2, 3]), {
      failOn: 'error',
      limitInputPixels: 40_000_000,
    })
    expect(pipeline.rotate).toHaveBeenCalledTimes(1)
    expect(pipeline.grayscale).toHaveBeenCalledTimes(1)
    expect(pipeline.normalize).toHaveBeenCalledTimes(1)
    expect(pipeline.sharpen).toHaveBeenCalledTimes(1)
    expect(pipeline.resize).toHaveBeenCalledWith({
      width: 2_000,
      height: 2_000,
      fit: 'inside',
      withoutEnlargement: false,
    })
    expect(pipeline.png).toHaveBeenCalledTimes(1)
    expect(createWorkerMock).toHaveBeenCalledWith('eng', OEM.LSTM_ONLY, {
      langPath: 'local-tessdata',
      gzip: true,
      cacheMethod: 'none',
    })
    expect(worker.setParameters).toHaveBeenCalledWith({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      tessedit_char_whitelist: '0123456789.,',
      preserve_interword_spaces: '1',
    })
    expect(worker.recognize).toHaveBeenCalledWith(preparedImage, {}, { text: true, blocks: true })
  })

  it('returns no candidate when there is no numeric word and truncates stored text', async () => {
    worker.recognize.mockResolvedValue({ data: { text: 'A'.repeat(5_100), blocks: null } })
    const recognized = await provider.recognize('https://res.cloudinary.com/demo/meter.jpg')
    expect(recognized.text).toHaveLength(5_000)
    expect(recognized.candidates).toEqual([])
  })

  it.each([
    ['an insecure URL', 'http://res.cloudinary.com/demo/meter.jpg'],
    ['an invalid URL', 'not-a-url'],
  ])('rejects %s before downloading', async (_case, imageUrl) => {
    await expect(provider.recognize(imageUrl)).rejects.toThrow('OCR_PROVIDER_ERROR')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns a safe error for download, oversized image, and preprocessing failures', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network details'))
    await expect(provider.recognize('https://res.cloudinary.com/demo/one.jpg')).rejects.toThrow('OCR_PROVIDER_ERROR')

    fetchMock.mockResolvedValueOnce(response(Uint8Array.from([1]), { 'content-length': '6000000' }))
    await expect(provider.recognize('https://res.cloudinary.com/demo/two.jpg')).rejects.toThrow('OCR_PROVIDER_ERROR')

    pipeline.toBuffer.mockRejectedValueOnce(new Error('sharp details'))
    await expect(provider.recognize('https://res.cloudinary.com/demo/three.jpg')).rejects.toThrow('OCR_PROVIDER_ERROR')
  })

  it('reuses one worker and terminates it on module shutdown', async () => {
    await provider.recognize('https://res.cloudinary.com/demo/one.jpg')
    await provider.recognize('https://res.cloudinary.com/demo/two.jpg')

    expect(createWorkerMock).toHaveBeenCalledTimes(1)
    await provider.onModuleDestroy()
    expect(worker.terminate).toHaveBeenCalledTimes(1)
    await expect(provider.recognize('https://res.cloudinary.com/demo/three.jpg')).rejects.toThrow('OCR_PROVIDER_ERROR')
  })

  it('serializes recognition calls that share a worker', async () => {
    let finishFirst!: (value: ReturnType<typeof result>) => void
    const firstResult = new Promise<ReturnType<typeof result>>((resolve) => {
      finishFirst = resolve
    })
    worker.recognize.mockImplementationOnce(() => firstResult).mockResolvedValueOnce(result([]))

    const first = provider.recognize('https://res.cloudinary.com/demo/one.jpg')
    const second = provider.recognize('https://res.cloudinary.com/demo/two.jpg')
    await new Promise((resolve) => setImmediate(resolve))

    expect(worker.recognize).toHaveBeenCalledTimes(1)
    finishFirst(result([]))
    await Promise.all([first, second])
    expect(worker.recognize).toHaveBeenCalledTimes(2)
  })

  it('discards a failed worker so a retry can create a fresh one', async () => {
    const failedWorker = worker
    failedWorker.recognize.mockRejectedValueOnce(new Error('worker details'))
    const nextWorker = {
      setParameters: jest.fn().mockResolvedValue(undefined),
      recognize: jest.fn().mockResolvedValue(result([{ text: '123', confidence: 95 }])),
      terminate: jest.fn().mockResolvedValue(undefined),
    }
    createWorkerMock.mockResolvedValueOnce(failedWorker).mockResolvedValueOnce(nextWorker)

    await expect(provider.recognize('https://res.cloudinary.com/demo/one.jpg')).rejects.toThrow('OCR_PROVIDER_ERROR')
    await expect(provider.recognize('https://res.cloudinary.com/demo/two.jpg')).resolves.toEqual(
      expect.objectContaining({ candidates: [{ text: '123', value: '123', confidence: 0.95 }] }),
    )

    expect(failedWorker.terminate).toHaveBeenCalledTimes(1)
    expect(createWorkerMock).toHaveBeenCalledTimes(2)
  })
})
