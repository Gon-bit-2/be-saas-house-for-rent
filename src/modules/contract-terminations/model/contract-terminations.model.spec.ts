import {
  CompleteContractTerminationBodySchema,
  CreateContractTerminationBodySchema,
} from './contract-terminations.model'

describe('contract termination schemas', () => {
  it('parses an exact date-only value without timezone drift', () => {
    const value = CreateContractTerminationBodySchema.parse({
      contractId: 1,
      reason: 'Chuyen nha',
      expectedMoveOutDate: '2026-08-31',
    })
    expect(value.expectedMoveOutDate.toISOString()).toBe('2026-08-31T00:00:00.000Z')
  })

  it('rejects invalid dates and unknown fields', () => {
    expect(() =>
      CreateContractTerminationBodySchema.parse({ contractId: 1, reason: 'x', expectedMoveOutDate: '2026-02-30' }),
    ).toThrow()
    expect(() =>
      CreateContractTerminationBodySchema.parse({
        contractId: 1,
        reason: 'x',
        expectedMoveOutDate: '2026-08-01',
        tenantId: 2,
      }),
    ).toThrow()
  })

  it('defaults debt acknowledgement to false', () => {
    const value = CompleteContractTerminationBodySchema.parse({
      checkoutHandoverId: 2,
      actualMoveOutDate: '2026-08-01',
    })
    expect(value.acknowledgeOutstandingDebt).toBe(false)
  })
})
