import { CreateAssetCategoryBodySchema, CreateRoomAssetBodySchema, UpdateRoomAssetBodySchema } from './assets.model'

describe('asset schemas', () => {
  it('rejects unknown category fields', () => {
    expect(() => CreateAssetCategoryBodySchema.parse({ name: 'Noi that', tenantId: 2 })).toThrow()
  })

  it('requires a positive asset quantity', () => {
    expect(() => CreateRoomAssetBodySchema.parse({ categoryId: 1, name: 'Tu', quantity: 0 })).toThrow()
  })

  it('rejects an empty asset update', () => {
    expect(() => UpdateRoomAssetBodySchema.parse({})).toThrow()
  })
})
