import { addBillingCycle } from './subscription-period.util'

describe('addBillingCycle', () => {
  it('clamps a monthly cycle to the last day of the target month', () => {
    expect(addBillingCycle(new Date('2026-01-31T10:20:30.000Z'), 'MONTHLY')).toEqual(
      new Date('2026-02-28T10:20:30.000Z'),
    )
  })

  it('clamps leap day when adding a yearly cycle', () => {
    expect(addBillingCycle(new Date('2024-02-29T00:00:00.000Z'), 'YEARLY')).toEqual(
      new Date('2025-02-28T00:00:00.000Z'),
    )
  })
})
