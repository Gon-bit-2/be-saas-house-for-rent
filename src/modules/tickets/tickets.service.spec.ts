import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import roleName from '@src/common/constants/role.constant'
import sharp from 'sharp'
import { TicketsService } from './tickets.service'

jest.mock('@src/shared/modules/services/tenant-access.service', () => ({
  TenantAccessService: class TenantAccessService {},
}))
jest.mock('@src/modules/notifications/notification-events.service', () => ({
  NotificationEventsService: class NotificationEventsService {},
}))
jest.mock('./repositories/tickets.repo', () => ({ TicketsRepository: class TicketsRepository {} }))

describe('TicketsService', () => {
  let service: TicketsService
  let ticketsRepository: Record<string, jest.Mock>
  let tenantAccessService: Record<string, jest.Mock>
  let notificationEventsService: Record<string, jest.Mock>
  let cloudinaryService: Record<string, jest.Mock>

  beforeEach(() => {
    ticketsRepository = {
      findActiveRenterContractForRoom: jest.fn(),
      createTicket: jest.fn(),
      findUserTicket: jest.fn(),
      createComment: jest.fn(),
      findTenantTicket: jest.fn(),
      updateTicket: jest.fn(),
      transitionTicket: jest.fn(),
      findRenterCommentsAndCount: jest.fn(),
      createAttachment: jest.fn(),
    }
    tenantAccessService = {
      getActiveTenantContext: jest
        .fn()
        .mockResolvedValue({ tenantId: 2, userId: 99, memberId: 1, roleId: roleName.LANDLORD }),
    }
    notificationEventsService = {
      notifyTicketCreated: jest.fn(),
      notifyTicketUpdated: jest.fn(),
      notifyTicketStatusChanged: jest.fn(),
      notifyTicketAttachmentAdded: jest.fn(),
    }
    cloudinaryService = { uploadImage: jest.fn(), deleteImage: jest.fn() }
    service = new TicketsService(
      ticketsRepository as never,
      tenantAccessService as never,
      notificationEventsService as never,
      cloudinaryService as never,
    )
  })

  it('creates a renter ticket for an active contract and notifies tenant staff', async () => {
    ticketsRepository.findActiveRenterContractForRoom.mockResolvedValue({ id: 5, tenantId: 2, roomId: 7 })
    ticketsRepository.createTicket.mockResolvedValue({
      id: 11,
      tenantId: 2,
      title: 'Hong nuoc',
      createdById: 50,
      _count: { comments: 0, attachments: 0 },
    })

    const result = await service.create(50, {
      roomId: 7,
      title: 'Hong nuoc',
      description: 'Vo ong nuoc',
      category: 'WATER',
      priority: 'HIGH',
      attachments: [],
    })

    expect(ticketsRepository.createTicket).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 2, roomId: 7, contractId: 5 }),
    )
    expect(notificationEventsService.notifyTicketCreated).toHaveBeenCalledWith(expect.objectContaining({ id: 11 }))
    expect(result.id).toBe(11)
  })

  it('rejects ticket creation without an active renter contract', async () => {
    ticketsRepository.findActiveRenterContractForRoom.mockResolvedValue(null)

    await expect(
      service.create(50, {
        roomId: 7,
        title: 'Hong nuoc',
        description: 'Vo ong nuoc',
        category: 'WATER',
        priority: 'HIGH',
        attachments: [],
      }),
    ).rejects.toBeInstanceOf(NotFoundException)
  })

  it('rejects internal comments from tenants', async () => {
    ticketsRepository.findUserTicket.mockResolvedValue({
      id: 11,
      tenantId: 2,
      title: 'Hong nuoc',
      _count: { comments: 0, attachments: 0 },
    })

    await expect(
      service.addComment(50, roleName.TENANT, 11, { message: 'Noi bo', isInternal: true }),
    ).rejects.toBeInstanceOf(ForbiddenException)
    expect(ticketsRepository.createComment).not.toHaveBeenCalled()
  })

  it('paginates public renter comments after checking ticket visibility', async () => {
    ticketsRepository.findUserTicket.mockResolvedValue({
      id: 11,
      tenantId: 2,
      _count: { comments: 2, attachments: 0 },
    })
    ticketsRepository.findRenterCommentsAndCount.mockResolvedValue([[{ id: 1, message: 'Public' }], 2])

    const result = await service.listMyComments(50, 11, { page: 1, limit: 20 })

    expect(ticketsRepository.findRenterCommentsAndCount).toHaveBeenCalledWith(11, 0, 20)
    expect(result.meta).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 })
  })

  it('hides unassigned maintenance tickets with 404 semantics', async () => {
    tenantAccessService.getActiveTenantContext.mockResolvedValue({
      tenantId: 2,
      userId: 99,
      memberId: 1,
      roleId: roleName.MAINTENANCE_STAFF,
    })
    ticketsRepository.findTenantTicket.mockResolvedValue({ id: 11, assignedTo: 100 })

    await expect(service.getForLandlord(99, 11)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('lets renter close only a resolved ticket through CAS', async () => {
    const ticket = {
      id: 11,
      tenantId: 2,
      status: 'RESOLVED',
      assignedTo: 99,
      _count: { comments: 0, attachments: 0 },
    }
    ticketsRepository.findUserTicket.mockResolvedValue(ticket)
    ticketsRepository.transitionTicket.mockResolvedValue({ ...ticket, status: 'CLOSED' })

    await service.closeMine(50, 11)

    expect(ticketsRepository.transitionTicket).toHaveBeenCalledWith(
      expect.objectContaining({ expectedStatus: 'RESOLVED', status: 'CLOSED', action: 'RENTER_CLOSE_TICKET' }),
    )
  })

  it('rejects a corrupt image even when MIME and extension look valid', async () => {
    const file = {
      buffer: Buffer.from('not-an-image'),
      size: 12,
      mimetype: 'image/png',
      originalname: 'evidence.png',
    } as Express.Multer.File

    await expect(service.uploadAttachment(50, roleName.TENANT, 11, file)).rejects.toBeInstanceOf(BadRequestException)
    expect(cloudinaryService.uploadImage).not.toHaveBeenCalled()
  })

  it('deletes the Cloudinary asset when attachment persistence fails', async () => {
    const buffer = await sharp({ create: { width: 1, height: 1, channels: 3, background: '#ffffff' } })
      .png()
      .toBuffer()
    const file = {
      buffer,
      size: buffer.length,
      mimetype: 'image/png',
      originalname: 'evidence.png',
    } as Express.Multer.File
    ticketsRepository.findUserTicket.mockResolvedValue({
      id: 11,
      tenantId: 2,
      status: 'OPEN',
      contract: { renterId: 50 },
      _count: { comments: 0, attachments: 0 },
    })
    cloudinaryService.uploadImage.mockResolvedValue({ url: 'https://cdn/image.png', publicId: 'tickets/2/11/a' })
    ticketsRepository.createAttachment.mockRejectedValue(new Error('DB_FAILED'))

    await expect(service.uploadAttachment(50, roleName.TENANT, 11, file)).rejects.toThrow('DB_FAILED')
    expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('tickets/2/11/a')
  })
})
