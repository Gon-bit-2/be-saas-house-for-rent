import { CreateReportBodySchema, UpdateReportStatusBodySchema } from './reports.model'

describe('report schemas', () => {
  it('accepts numeric target ids and rejects unknown input', () => {
    expect(
      CreateReportBodySchema.safeParse({ targetType: 'ROOM', targetId: 20, reason: 'Thông tin không chính xác' })
        .success,
    ).toBe(true)
    expect(
      CreateReportBodySchema.safeParse({
        targetType: 'ROOM',
        targetId: 'abc',
        reason: 'Thông tin không chính xác',
      }).success,
    ).toBe(false)
    expect(
      CreateReportBodySchema.safeParse({
        targetType: 'ROOM',
        targetId: '20',
        reason: 'Thông tin không chính xác',
        handledBy: 1,
      }).success,
    ).toBe(false)
  })

  it('requires a resolution note only for terminal states', () => {
    expect(UpdateReportStatusBodySchema.safeParse({ status: 'REVIEWING' }).success).toBe(true)
    expect(UpdateReportStatusBodySchema.safeParse({ status: 'RESOLVED' }).success).toBe(false)
    expect(
      UpdateReportStatusBodySchema.safeParse({ status: 'REJECTED', resolutionNote: 'Không đủ căn cứ' }).success,
    ).toBe(true)
  })
})
