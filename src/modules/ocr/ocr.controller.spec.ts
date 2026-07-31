import roleName from '@src/common/constants/role.constant'
import { ROLES_KEY } from '@src/common/decorators/decorators/roles.decorator'
import { OcrController } from './ocr.controller'

jest.mock('./ocr.service', () => ({ OcrService: class OcrService {} }))

describe('OcrController', () => {
  const user = { userId: 50, roleId: 'LANDLORD', roleName: 'LANDLORD' }
  let service: Record<string, jest.Mock>
  let controller: import('./ocr.controller').OcrController

  beforeEach(() => {
    service = {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      retry: jest.fn(),
      accept: jest.fn(),
    }
    controller = new OcrController(service as never)
  })

  it('restricts OCR to landlords', () => {
    expect(Reflect.getMetadata(ROLES_KEY, OcrController)).toEqual([roleName.LANDLORD])
  })

  it('delegates all operations with the active user id', async () => {
    const file = { buffer: Buffer.from('meter') } as Express.Multer.File
    const acceptBody = { billingMonth: new Date('2026-07-01T00:00:00.000Z'), currentValue: 123 }

    await controller.list(user, { page: 1, limit: 20, status: 'SUCCESS' })
    await controller.getById(user, 1)
    await controller.create(user, { meterId: 2 }, file)
    await controller.retry(user, 1)
    await controller.accept(user, 1, acceptBody)

    expect(service.list).toHaveBeenCalledWith(50, { page: 1, limit: 20, status: 'SUCCESS' })
    expect(service.getById).toHaveBeenCalledWith(50, 1)
    expect(service.create).toHaveBeenCalledWith(50, { meterId: 2 }, file)
    expect(service.retry).toHaveBeenCalledWith(50, 1)
    expect(service.accept).toHaveBeenCalledWith(50, 1, acceptBody)
  })
})
