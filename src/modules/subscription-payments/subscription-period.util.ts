import type { BillingCycle } from 'generated/prisma/enums'

function daysInUtcMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
}

export function addBillingCycle(date: Date, billingCycle: BillingCycle) {
  const result = new Date(date)
  const day = result.getUTCDate()

  if (billingCycle === 'YEARLY') {
    const targetYear = result.getUTCFullYear() + 1
    const targetDay = Math.min(day, daysInUtcMonth(targetYear, result.getUTCMonth()))
    result.setUTCDate(1)
    result.setUTCFullYear(targetYear)
    result.setUTCDate(targetDay)
    return result
  }

  const targetMonth = result.getUTCMonth() + 1
  const targetYear = result.getUTCFullYear() + Math.floor(targetMonth / 12)
  const normalizedMonth = ((targetMonth % 12) + 12) % 12
  const targetDay = Math.min(day, daysInUtcMonth(targetYear, normalizedMonth))
  result.setUTCDate(1)
  result.setUTCFullYear(targetYear)
  result.setUTCMonth(normalizedMonth)
  result.setUTCDate(targetDay)
  return result
}
