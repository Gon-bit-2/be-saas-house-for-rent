import { BadRequestException, ConflictException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common'
import { OcrService } from './ocr.service'

jest.mock('@src/shared/modules/services/tenant-access.service', () => ({
  TenantAccessService: class TenantAccessService {},
}))
jest.mock('@src/shared/modules/services/cloudinary.service', () => ({ CloudinaryService: class CloudinaryService {} }))
jest.mock('@src/modules/utility-meters/meter-readings.service', () => ({
  MeterReadingsService: class MeterReadingsService {},
}))
jest.mock('./repositories/ocr.repo', () => ({ OcrRepository: class OcrRepository {} }))

describe('OcrService', () => {
  const tenant = { tenantId: 10, userId: 50, memberId: 1, roleId: 'LANDLORD' }
  const meter = { id: 2, roomId: 3, status: 'ACTIVE' }
  const pendingJob = {
    id: 7,
    tenantId: 10,
    roomId: 3,
    meterId: 2,
    status: 'PENDING',
    recognizedValue: null,
    reading: null,
    imageUrl: 'https://example.com/meter.jpg',
  }

  let repository: Record<string, jest.Mock>
  let tenantAccess: Record<string, jest.Mock>
  let cloudinary: Record<string, jest.Mock>
  let meterReadings: Record<string, jest.Mock>
  let queue: Record<string, jest.Mock>
  let service: import('./ocr.service').OcrService

  beforeEach(() => {
    repository = {
      list: jest.fn(),
      findById: jest.fn(),
      findByHash: jest.fn(),
      findReading: jest.fn(),
      findMeter: jest.fn().mockResolvedValue(meter),
      isEnabled: jest.fn().mockResolvedValue(true),
      create: jest.fn().mockResolvedValue({ job: pendingJob, backgroundJobId: 9 }),
      retry: jest.fn(),
      accept: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      updateBackground: jest.fn().mockResolvedValue(undefined),
      setBackgroundExternalId: jest.fn().mockResolvedValue(undefined),
    }
    tenantAccess = { getActiveTenantContext: jest.fn().mockResolvedValue(tenant) }
    cloudinary = {
      uploadImage: jest.fn().mockResolvedValue({ url: pendingJob.imageUrl, publicId: 'ocr/10/2/image' }),
      deleteImage: jest.fn().mockResolvedValue(undefined),
    }
    meterReadings = { prepare: jest.fn() }
    queue = { add: jest.fn().mockResolvedValue({ id: 'bull-9' }) }
    service = new OcrService(
      repository as never,
      tenantAccess as never,
      cloudinary as never,
      meterReadings as never,
      queue as never,
    )
  })

  it('rejects tenants whose current plan does not allow OCR', async () => {
    repository.isEnabled.mockResolvedValue(false)
    await expect(service.create(50, { meterId: 2 }, { buffer: Buffer.from('image') } as never)).rejects.toBeInstanceOf(
      ForbiddenException,
    )
    expect(cloudinary.uploadImage).not.toHaveBeenCalled()
  })

  it('returns an existing job for the same meter and file hash', async () => {
    repository.findByHash.mockResolvedValue(pendingJob)
    const result = await service.create(50, { meterId: 2 }, { buffer: Buffer.from('image') } as never)
    expect(result).toBe(pendingJob)
    expect(cloudinary.uploadImage).not.toHaveBeenCalled()
    expect(queue.add).not.toHaveBeenCalled()
  })

  it('uploads, persists, and enqueues a new OCR job', async () => {
    repository.findByHash.mockResolvedValue(null)
    const result = await service.create(50, { meterId: 2 }, { buffer: Buffer.from('image') } as never)

    expect(result).toBe(pendingJob)
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 10, roomId: 3, meterId: 2, uploadedBy: 50, status: 'PENDING' }),
    )
    expect(queue.add).toHaveBeenCalledWith('PROCESS_OCR_JOB', { ocrJobId: 7, backgroundJobId: 9 }, { jobId: 'ocr-9' })
  })

  it('returns the concurrent job when the unique file hash wins the race', async () => {
    repository.findByHash.mockResolvedValueOnce(null).mockResolvedValueOnce(pendingJob)
    repository.create.mockRejectedValue({ code: 'P2002' })

    await expect(service.create(50, { meterId: 2 }, { buffer: Buffer.from('image') } as never)).resolves.toBe(
      pendingJob,
    )
    expect(cloudinary.deleteImage).toHaveBeenCalledWith('ocr/10/2/image')
    expect(queue.add).not.toHaveBeenCalled()
  })

  it('cleans up the database and image when enqueue fails', async () => {
    repository.findByHash.mockResolvedValue(null)
    queue.add.mockRejectedValue(new Error('redis unavailable'))

    await expect(service.create(50, { meterId: 2 }, { buffer: Buffer.from('image') } as never)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    )
    expect(repository.remove).toHaveBeenCalledWith(7, 9)
    expect(cloudinary.deleteImage).toHaveBeenCalledWith('ocr/10/2/image')
  })

  it('accepts a corrected value as a draft OCR reading', async () => {
    repository.findById.mockResolvedValue({ ...pendingJob, status: 'NEED_REVIEW', recognizedValue: 120 })
    meterReadings.prepare.mockResolvedValue({ tenantId: 10, roomId: 3, meterId: 2, billingMonth: new Date() })
    repository.accept.mockResolvedValue({ id: 15, source: 'OCR', status: 'DRAFT' })

    const result = await service.accept(50, 7, {
      billingMonth: new Date('2026-07-01T00:00:00.000Z'),
      currentValue: 123,
    })

    expect(meterReadings.prepare).toHaveBeenCalledWith(10, expect.objectContaining({ meterId: 2, currentValue: 123 }))
    expect(repository.accept).toHaveBeenCalledWith(
      10,
      7,
      expect.objectContaining({ imageUrl: pendingJob.imageUrl, source: 'OCR', status: 'DRAFT', createdById: 50 }),
    )
    expect(result).toEqual({ id: 15, source: 'OCR', status: 'DRAFT' })
  })

  it('returns the existing reading when the OCR job was already accepted', async () => {
    repository.findById.mockResolvedValue({ ...pendingJob, status: 'SUCCESS', reading: { id: 15 } })
    repository.findReading.mockResolvedValue({ id: 15 })
    await expect(service.accept(50, 7, { billingMonth: new Date() })).resolves.toEqual({ id: 15 })
    expect(meterReadings.prepare).not.toHaveBeenCalled()
  })

  it('returns the concurrent reading when another accept request wins the race', async () => {
    repository.findById.mockResolvedValue({ ...pendingJob, status: 'SUCCESS', recognizedValue: 120 })
    meterReadings.prepare.mockRejectedValue(new ConflictException())
    repository.findReading.mockResolvedValue({ id: 15 })

    await expect(service.accept(50, 7, { billingMonth: new Date() })).resolves.toEqual({ id: 15 })
    expect(repository.accept).not.toHaveBeenCalled()
  })

  it('requires a corrected value when OCR found no number', async () => {
    repository.findById.mockResolvedValue({ ...pendingJob, status: 'NEED_REVIEW', recognizedValue: null })
    await expect(service.accept(50, 7, { billingMonth: new Date() })).rejects.toBeInstanceOf(BadRequestException)
  })
})
