import { CreateHandoverBodySchema, UpdateHandoverBodySchema } from './handovers.model'

describe('handover schemas', () => {
  it('accepts a strict handover snapshot item', () => {
    const value = CreateHandoverBodySchema.parse({
      contractId: 1,
      type: 'CHECKIN',
      items: [{ roomAssetId: 2, actualQuantity: 1, condition: 'GOOD' }],
    })
    expect(value.items?.[0].actualQuantity).toBe(1)
  })

  it('requires version and a real update', () => {
    expect(() => UpdateHandoverBodySchema.parse({ version: 1 })).toThrow()
    expect(() => UpdateHandoverBodySchema.parse({ note: 'updated' })).toThrow()
  })
})
