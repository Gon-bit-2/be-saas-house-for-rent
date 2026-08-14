import { BadRequestException, ConflictException } from '@nestjs/common'

jest.mock('@src/shared/modules/services/tenant-access.service', () => ({
  TenantAccessService: class TenantAccessService {},
}))
jest.mock('./repositories/invoices.repo', () => ({ InvoicesRepository: class InvoicesRepository {} }))
jest.mock('@src/modules/notifications/notification-events.service', () => ({
  NotificationEventsService: class NotificationEventsService {},
}))
const { InvoicesService } = require('./invoices.service') as typeof import('./invoices.service')

describe('InvoicesService', () => {
  let service: import('./invoices.service').InvoicesService
  let invoicesRepository: Record<string, jest.Mock>
  let tenantAccessService: Record<string, jest.Mock>

  const activeContract = {
    id: 7,
    tenantId: 10,
    roomId: 5,
    renterId: 99,
    contractCode: 'HD-001',
    monthlyPrice: 2500000,
    paymentDueDay: 5,
    room: { id: 5, roomCode: 'P101', title: 'Phong 101', deletedAt: null },
  }

  beforeEach(() => {
    invoicesRepository = {
      findInvoicesAndCount: jest.fn(),
      findDebtsAndCount: jest.fn(),
      getDebtStats: jest.fn().mockResolvedValue({
        totalOutstanding: 0,
        overdueMoreThan30Days: 0,
        overdueWithin30Days: 0,
        currentNotDue: 0,
      }),
      findTenantInvoice: jest.fn(),
      findMyInvoicesAndCount: jest.fn(),
      findMyInvoice: jest.fn(),
      findActiveContractForInvoice: jest.fn(),
      findExistingInvoiceForContractMonth: jest.fn(),
      findConfirmedReadingsForInvoice: jest.fn(),
      findServiceAssignmentsForInvoice: jest.fn(),
      isInvoiceCodeTaken: jest.fn(),
      countSuccessfulPayments: jest.fn(),
      createInvoiceWithItemsAndDebt: jest.fn(),
      updateDraftInvoiceWithDebt: jest.fn(),
      updateInvoiceAndDebtStatus: jest.fn(),
    }
    tenantAccessService = {
      getActiveTenantContext: jest
        .fn()
        .mockResolvedValue({ tenantId: 10, userId: 50, memberId: 1, roleId: 'LANDLORD' }),
    }
    notificationEventsService = {
      notifyInvoiceIssued: jest.fn(),
      notifyInvoiceOverdue: jest.fn(),
    }
    service = new InvoicesService(
      invoicesRepository as never,
      tenantAccessService as never,
      notificationEventsService as never,
    )
  })

  it('creates invoice items and a matching open debt record', async () => {
    invoicesRepository.findActiveContractForInvoice.mockResolvedValue(activeContract)
    invoicesRepository.findExistingInvoiceForContractMonth.mockResolvedValue(null)
    invoicesRepository.findConfirmedReadingsForInvoice.mockResolvedValue([
      {
        id: 1,
        consumption: 30,
        unitPrice: 3500,
        amount: 105000,
        previousValue: 100,
        currentValue: 130,
        meter: { type: 'ELECTRICITY', unit: 'kWh' },
      },
    ])
    invoicesRepository.findServiceAssignmentsForInvoice.mockResolvedValue([
      {
        quantity: 2,
        unitPrice: null,
        serviceItem: { name: 'Giữ xe', itemType: 'PARKING', defaultUnitPrice: 50000, unitLabel: 'xe' },
      },
    ])
    invoicesRepository.isInvoiceCodeTaken.mockResolvedValue(false)
    invoicesRepository.createInvoiceWithItemsAndDebt.mockResolvedValue({ id: 12, status: 'UNPAID' })

    await service.create(50, {
      contractId: 7,
      billingMonth: new Date('2026-07-12T00:00:00.000Z'),
      issueDate: new Date('2026-07-01T00:00:00.000Z'),
      dueDate: new Date('2026-07-05T00:00:00.000Z'),
      status: 'UNPAID',
      extraItems: [{ itemType: 'SERVICE', description: 'Phi dich vu', quantity: 1, unitPrice: 100000 }],
    })

    expect(notificationEventsService.notifyInvoiceIssued).toHaveBeenCalledWith(expect.objectContaining({ id: 12 }))
    expect(invoicesRepository.createInvoiceWithItemsAndDebt).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 10,
        contractId: 7,
        roomId: 5,
        renterId: 99,
        billingMonth: new Date('2026-07-01T00:00:00.000Z'),
        subtotal: 2805000,
        totalAmount: 2805000,
        paidAmount: 0,
        debtAmount: 2805000,
        status: 'UNPAID',
      }),
      expect.arrayContaining([
        expect.objectContaining({ itemType: 'RENT', amount: 2500000 }),
        expect.objectContaining({ itemType: 'ELECTRICITY', amount: 105000, meterReadingId: 1 }),
        expect.objectContaining({ itemType: 'SERVICE', amount: 100000 }),
        expect.objectContaining({ itemType: 'PARKING', quantity: 2, unitPrice: 50000, amount: 100000 }),
      ]),
      'OPEN',
    )
  })

  it('rejects duplicate invoice for the same contract and billing month', async () => {
    invoicesRepository.findActiveContractForInvoice.mockResolvedValue(activeContract)
    invoicesRepository.findExistingInvoiceForContractMonth.mockResolvedValue({ id: 1 })

    await expect(
      service.create(50, {
        contractId: 7,
        billingMonth: new Date('2026-07-01T00:00:00.000Z'),
        issueDate: new Date('2026-07-01T00:00:00.000Z'),
        dueDate: new Date('2026-07-05T00:00:00.000Z'),
        status: 'DRAFT',
        extraItems: [],
      }),
    ).rejects.toBeInstanceOf(ConflictException)
  })

  it('issues a draft invoice and opens its debt', async () => {
    invoicesRepository.findTenantInvoice.mockResolvedValue({ id: 3, status: 'DRAFT' })
    invoicesRepository.updateInvoiceAndDebtStatus.mockResolvedValue({ id: 3, status: 'UNPAID' })

    await service.issue(50, 3)

    expect(invoicesRepository.updateInvoiceAndDebtStatus).toHaveBeenCalledWith(3, 'UNPAID', 'OPEN', 50)
    expect(notificationEventsService.notifyInvoiceIssued).toHaveBeenCalledWith(expect.objectContaining({ id: 3 }))
  })

  it('cancels unpaid invoice and cancels its debt', async () => {
    invoicesRepository.findTenantInvoice.mockResolvedValue({ id: 3, status: 'UNPAID' })
    invoicesRepository.countSuccessfulPayments.mockResolvedValue(0)
    invoicesRepository.updateInvoiceAndDebtStatus.mockResolvedValue({ id: 3, status: 'CANCELED' })

    await service.cancel(50, 3)

    expect(invoicesRepository.updateInvoiceAndDebtStatus).toHaveBeenCalledWith(3, 'CANCELED', 'CANCELED', 50)
  })

  it('rejects cancel when invoice has successful payment', async () => {
    invoicesRepository.findTenantInvoice.mockResolvedValue({ id: 3, status: 'UNPAID' })
    invoicesRepository.countSuccessfulPayments.mockResolvedValue(1)

    await expect(service.cancel(50, 3)).rejects.toBeInstanceOf(BadRequestException)
    expect(invoicesRepository.updateInvoiceAndDebtStatus).not.toHaveBeenCalled()
  })

  it('lists debt records from the real debt table', async () => {
    invoicesRepository.findDebtsAndCount.mockResolvedValue([[{ id: 1, status: 'OPEN' }], 1])
    invoicesRepository.getDebtStats.mockResolvedValue({
      totalOutstanding: '5000',
      overdueMoreThan30Days: '2000',
      overdueWithin30Days: '1000',
      currentNotDue: '2000',
    })

    const result = await service.listDebts(50, { page: 1, limit: 20, status: 'OPEN' })

    expect(invoicesRepository.findDebtsAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 10, status: 'OPEN' }),
      0,
      20,
    )
    expect(result.meta.total).toBe(1)
    expect(invoicesRepository.getDebtStats).toHaveBeenCalledWith(
      expect.not.objectContaining({ status: expect.anything() }),
      expect.any(Date),
    )
    expect(invoicesRepository.getDebtStats.mock.calls[0][0]).toEqual(expect.objectContaining({ tenantId: 10 }))
    expect(result.stats).toEqual({
      totalOutstanding: 5000,
      overdueMoreThan30Days: 2000,
      overdueWithin30Days: 1000,
      currentNotDue: 2000,
    })
  })

  it('applies invoice filters while forcing the authenticated renter id', async () => {
    invoicesRepository.findInvoicesAndCount.mockResolvedValue([[{ id: 1, renterId: 99 }], 1])

    const result = await service.listMine(99, {
      page: 1,
      limit: 20,
      renterId: 1234,
      status: 'UNPAID',
      roomId: 5,
    })

    expect(invoicesRepository.findInvoicesAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ renterId: 99, tenantId: undefined, status: 'UNPAID', roomId: 5 }),
      0,
      20,
    )
    expect(result.meta.total).toBe(1)
  })

  it('lists debt only for the authenticated renter', async () => {
    invoicesRepository.findDebtsAndCount.mockResolvedValue([[{ id: 1, renterId: 99 }], 1])

    await service.listMyDebts(99, { page: 1, limit: 20, renterId: 1234, status: 'OPEN' })

    expect(invoicesRepository.findDebtsAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ renterId: 99, tenantId: undefined, status: 'OPEN' }),
      0,
      20,
    )
    expect(invoicesRepository.getDebtStats).toHaveBeenCalledWith(
      expect.not.objectContaining({ status: expect.anything() }),
      expect.any(Date),
    )
    expect(invoicesRepository.getDebtStats.mock.calls[0][0]).toEqual(
      expect.objectContaining({ renterId: 99, tenantId: undefined }),
    )
  })
})
