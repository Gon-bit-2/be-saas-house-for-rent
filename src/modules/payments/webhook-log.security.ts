import { createHmac } from 'crypto'

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function compactString(value: unknown, maxLength = 500) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : null
}

function finiteNumber(value: unknown) {
  const numberValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

export function sanitizePayosWebhookPayload(payload: unknown) {
  const root = asRecord(payload)
  const data = asRecord(root.data)
  return {
    code: compactString(root.code, 20),
    desc: compactString(root.desc),
    success: root.success === true,
    data: {
      orderCode: finiteNumber(data.orderCode),
      amount: finiteNumber(data.amount),
      reference: compactString(data.reference, 100),
      transactionDateTime: compactString(data.transactionDateTime, 100),
      currency: compactString(data.currency, 10),
      paymentLinkId: compactString(data.paymentLinkId, 100),
      code: compactString(data.code, 20),
      desc: compactString(data.desc),
    },
  }
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`
  }
  const objectValue = value as JsonRecord
  return `{${Object.keys(objectValue)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(objectValue[key])}`)
    .join(',')}}`
}

export function digestWebhookPayload(payload: unknown, secret: string) {
  return createHmac('sha256', secret).update(canonicalize(payload)).digest('hex')
}

export function sanitizeWebhookText(value: string | null | undefined, maxLength = 500) {
  return (
    value
      ?.replace(/[\r\n\t]+/g, ' ')
      .trim()
      .slice(0, maxLength) || null
  )
}
