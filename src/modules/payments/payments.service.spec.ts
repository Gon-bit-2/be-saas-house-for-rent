import { BadRequestException, NotFoundException } from '@nestjs/common'

jest.mock('@src/shared/modules/services/tenant-access.service', () => ({
  TenantAccessService: class TenantAccessService {},
}))
jest.mock('./repositories/payments.repo', () => ({ PaymentsRepository: class PaymentsRepository {} }))
jest.mock('./payos.service', () => ({ PayosService: class PayosService {} }))
jest.mock('@src/modules/notifications/notification-events.service', () => ({
  NotificationEventsService: class NotificationEventsService {},
}))
const { PaymentsService } = require('./payments.service') as typeof import('./payments.service')

describe('PaymentsService', () => {
  let service: import('./payments.service').PaymentsService
  let paymentsRepository: Record<string, jest.Mock>
  let tenantAccessService: Record<string, jest.Mock>
  let payosService: Record<string, jest.Mock>
  let notificationEventsService: Record<string, jest.Mock>

  const invoice = {
    id: 10,
    tenantId: 2,
    renterId: 50,
    invoiceCode: 'INV-2-202607-ABC123',
    status: 'UNPAID' as const,
    totalAmount: 3000000,
    paidAmount: 0,
    debtAmount: 3000000,
    dueDate: new Date('2026-07-20T00:00:00.000Z'),
    renter: { id: 50, fullName: 'Nguyen Van A', email: 'a@example.com', phone: '0900000000' },
    room: { id: 4, roomCode: 'P101', title: 'Phong 101' },
  }

  beforeEach(() => {
    paymentsRepository = {
      findPaymentsAndCount: jest.fn(),
      findTenantPayment: jest.fn(),
      findMyPayableInvoice: jest.fn(),
      findActiveQr: jest.fn(),
      createQrDraft: jest.fn(),
      updateQrWithPayos: jest.fn(),
      markQrCanceled: jest.fn(),
      createRenterConfirmation: jest.fn(),
      findQrByPayosIdentifiers: jest.fn(),
      createPendingWebhookPayment: jest.fn(),
      createWebhookLog: jest.fn(),
      approvePayment: jest.fn(),
      rejectPayment: jest.fn(),
    }
    tenantAccessService = {
      getActiveTenantContext: jest.fn().mockResolvedValue({ tenantId: 2, userId: 99, memberId: 1, roleId: 'LANDLORD' }),
    }
    payosService = {
      createPaymentLink: jest.fn(),
      verifyWebhook: jest.fn(),
    }
    notificationEventsService = {
      notifyPaymentPending: jest.fn(),
      notifyPaymentReviewed: jest.fn(),
    }
    service = new PaymentsService(
      paymentsRepository as never,
      tenantAccessService as never,
      payosService as never,
      notificationEventsService as never,
    )
  })

  it('creates a PayOS QR from a draft row and updates it with provider data', async () => {
    paymentsRepository.findMyPayableInvoice.mockResolvedValue(invoice)
    paymentsRepository.findActiveQr.mockResolvedValue(null)
    paymentsRepository.createQrDraft.mockResolvedValue({ id: 7, orderCode: 7 })
    payosService.createPaymentLink.mockResolvedValue({
      paymentLinkId: 'link_123',
      checkoutUrl: 'https://pay.payos.vn/link_123',
      qrCode: 'qr-content',
      status: 'PENDING',
    })
    paymentsRepository.updateQrWithPayos.mockResolvedValue({ id: 7, paymentLinkId: 'link_123' })

    const result = await service.createMyPaymentQr(50, 10)

    expect(paymentsRepository.createQrDraft).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 2, invoiceId: 10, amount: 3000000 }),
    )
    expect(payosService.createPaymentLink).toHaveBeenCalledWith(
      expect.objectContaining({ orderCode: 7, amount: 3000000 }),
    )
    expect(paymentsRepository.updateQrWithPayos).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        paymentLinkId: 'link_123',
        checkoutUrl: 'https://pay.payos.vn/link_123',
        qrContent: 'qr-content',
      }),
    )
    expect(result).toEqual({ id: 7, paymentLinkId: 'link_123' })
  })

  it('reuses an active QR for the same remaining debt', async () => {
    paymentsRepository.findMyPayableInvoice.mockResolvedValue(invoice)
    paymentsRepository.findActiveQr.mockResolvedValue({ id: 8, orderCode: 8 })

    const result = await service.createMyPaymentQr(50, 10)

    expect(payosService.createPaymentLink).not.toHaveBeenCalled()
    expect(result).toEqual({ id: 8, orderCode: 8 })
  })

  it('rejects renter confirmation that exceeds remaining debt', async () => {
    paymentsRepository.findMyPayableInvoice.mockResolvedValue(invoice)

    await expect(service.submitMyConfirmation(50, 10, { amount: 4000000 })).rejects.toBeInstanceOf(BadRequestException)
    expect(paymentsRepository.createRenterConfirmation).not.toHaveBeenCalled()
  })

  it('approves only pending tenant payments', async () => {
    paymentsRepository.approvePayment.mockResolvedValue({
      id: 3,
      status: 'SUCCESS',
      payerId: 50,
      tenantId: 2,
      invoiceId: 10,
      amount: 1000000,
      invoice: { invoiceCode: 'INV-1' },
    })

    await service.approve(99, 3, { landlordNote: 'ok' })

    expect(paymentsRepository.approvePayment).toHaveBeenCalledWith(2, 3, 99, 'ok')
    expect(notificationEventsService.notifyPaymentReviewed).toHaveBeenCalledWith(
      expect.objectContaining({ id: 3, status: 'SUCCESS' }),
    )
  })

  it('rejects approval when payment is missing', async () => {
    paymentsRepository.approvePayment.mockRejectedValue(new NotFoundException())

    await expect(service.approve(99, 3, {})).rejects.toBeInstanceOf(NotFoundException)
  })

  it('creates a pending payment from a valid successful PayOS webhook', async () => {
    const payload = {
      code: '00',
      desc: 'success',
      success: true,
      data: {
        orderCode: 7,
        amount: 3000000,
        description: 'INV10',
        accountNumber: '12345678',
        reference: 'TF230204212323',
        transactionDateTime: '2026-07-16 18:25:00',
        currency: 'VND',
        paymentLinkId: 'link_123',
        code: '00',
        desc: 'Thành công',
        counterAccountBankId: '',
        counterAccountBankName: '',
        counterAccountName: '',
        counterAccountNumber: '',
        virtualAccountName: '',
        virtualAccountNumber: '',
      },
      signature: 'signature',
    }
    payosService.verifyWebhook.mockResolvedValue(payload.data)
    paymentsRepository.findQrByPayosIdentifiers.mockResolvedValue({
      id: 7,
      tenantId: 2,
      invoiceId: 10,
      amount: 3000000,
      invoice: { renterId: 50 },
    })
    paymentsRepository.createPendingWebhookPayment.mockResolvedValue({
      created: true,
      payment: {
        id: 9,
        tenantId: 2,
        invoiceId: 10,
        qrCodeId: 7,
        amount: 3000000,
        payer: { fullName: 'Nguyen Van A' },
        invoice: { invoiceCode: 'INV-1' },
      },
    })

    await service.handlePayosWebhook(payload)

    expect(paymentsRepository.createPendingWebhookPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 2,
        invoiceId: 10,
        payerId: 50,
        qrCodeId: 7,
        transactionCode: 'TF230204212323',
      }),
    )
    expect(paymentsRepository.createWebhookLog).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PROCESSED', signatureValid: true }),
    )
    const webhookLog = paymentsRepository.createWebhookLog.mock.calls[0][0] as {
      payloadDigest: string
      payload: unknown
    }
    expect(webhookLog.payloadDigest).toMatch(/^[a-f0-9]{64}$/)
    expect(JSON.stringify(webhookLog.payload)).not.toContain('12345678')
    expect(JSON.stringify(webhookLog.payload)).not.toContain('signature')
    expect(notificationEventsService.notifyPaymentPending).toHaveBeenCalledWith(expect.objectContaining({ id: 9 }))
  })

  it('acknowledges a duplicate PayOS webhook without sending another notification', async () => {
    const payload = {
      code: '00',
      desc: 'success',
      success: true,
      data: {
        orderCode: 7,
        amount: 3000000,
        description: 'INV10',
        accountNumber: '12345678',
        reference: 'REF-1',
        transactionDateTime: '2026-07-16 18:25:00',
        currency: 'VND',
        paymentLinkId: 'link_123',
        code: '00',
        desc: 'Thành công',
        counterAccountBankId: '',
        counterAccountBankName: '',
        counterAccountName: '',
        counterAccountNumber: '',
        virtualAccountName: '',
        virtualAccountNumber: '',
      },
      signature: 'signature',
    }
    payosService.verifyWebhook.mockResolvedValue(payload.data)
    paymentsRepository.findQrByPayosIdentifiers.mockResolvedValue({
      id: 7,
      tenantId: 2,
      invoiceId: 10,
      amount: 3000000,
      invoice: { renterId: 50 },
    })
    paymentsRepository.createPendingWebhookPayment.mockResolvedValue({
      created: false,
      payment: { id: 9, tenantId: 2, invoiceId: 10, qrCodeId: 7, amount: 3000000 },
    })

    await service.handlePayosWebhook(payload)

    expect(notificationEventsService.notifyPaymentPending).not.toHaveBeenCalled()
    expect(paymentsRepository.createWebhookLog).toHaveBeenCalledWith(expect.objectContaining({ status: 'IGNORED' }))
  })
})
