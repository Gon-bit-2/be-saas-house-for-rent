import { digestWebhookPayload, sanitizePayosWebhookPayload, sanitizeWebhookText } from './webhook-log.security'

describe('payment webhook log security', () => {
  const payload = {
    code: '00',
    desc: 'success',
    success: true,
    signature: 'secret-signature',
    data: {
      orderCode: 7,
      amount: 3000000,
      description: 'transfer description',
      accountNumber: '12345678',
      reference: 'REF-1',
      transactionDateTime: '2026-07-16 18:25:00',
      currency: 'VND',
      paymentLinkId: 'link_123',
      code: '00',
      desc: 'success',
      counterAccountName: 'Nguyen Van A',
      counterAccountNumber: '99999999',
      virtualAccountName: 'Virtual A',
      virtualAccountNumber: '88888888',
      nestedUnknown: { accountNumber: 'must-not-survive' },
    },
  }

  it('persists only allowlisted reconciliation fields', () => {
    const sanitized = sanitizePayosWebhookPayload(payload)
    const serialized = JSON.stringify(sanitized)

    expect(sanitized.data.reference).toBe('REF-1')
    expect(serialized).not.toContain('12345678')
    expect(serialized).not.toContain('Nguyen Van A')
    expect(serialized).not.toContain('secret-signature')
    expect(serialized).not.toContain('description')
  })

  it('creates a stable keyed digest independent of object key order', () => {
    const reordered = { data: payload.data, success: true, desc: 'success', code: '00', signature: 'secret-signature' }
    expect(digestWebhookPayload(payload, 'a'.repeat(32))).toBe(digestWebhookPayload(reordered, 'a'.repeat(32)))
    expect(digestWebhookPayload(payload, 'a'.repeat(32))).not.toBe(digestWebhookPayload(payload, 'b'.repeat(32)))
  })

  it('normalizes multiline provider messages', () => {
    expect(sanitizeWebhookText(' provider\n\terror ')).toBe('provider error')
  })
})
