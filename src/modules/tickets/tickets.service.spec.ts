import { ForbiddenException, NotFoundException } from '@nestjs/common'
import roleName from '@src/common/constants/role.constant'
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

  beforeEach(() => {
    ticketsRepository = {
      findActiveRenterContractForRoom: jest.fn(),
      createTicket: jest.fn(),
      findUserTicket: jest.fn(),
      createComment: jest.fn(),
      findTenantTicket: jest.fn(),
      updateTicket: jest.fn(),
      findRenterCommentsAndCount: jest.fn(),
    }
    tenantAccessService = {
      getActiveTenantContext: jest
        .fn()
        .mockResolvedValue({ tenantId: 2, userId: 99, memberId: 1, roleId: roleName.LANDLORD }),
    }
    notificationEventsService = {
      notifyTicketCreated: jest.fn(),
      notifyTicketUpdated: jest.fn(),
    }
    service = new TicketsService(
      ticketsRepository as never,
      tenantAccessService as never,
      notificationEventsService as never,
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
})
