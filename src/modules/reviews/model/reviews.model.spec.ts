import { CreateReviewBodySchema, UpdateReviewStatusBodySchema } from './reviews.model'

describe('review schemas', () => {
  const valid = {
    contractId: 1,
    rating: 5,
    content: 'Nội dung đánh giá hợp lệ',
    cleanlinessScore: 5,
    locationScore: 4,
    priceScore: 4,
    serviceScore: 5,
  }

  it('accepts valid scores and rejects unknown input', () => {
    expect(CreateReviewBodySchema.safeParse(valid).success).toBe(true)
    expect(CreateReviewBodySchema.safeParse({ ...valid, rating: 6 }).success).toBe(false)
    expect(CreateReviewBodySchema.safeParse({ ...valid, tenantId: 10 }).success).toBe(false)
  })

  it('requires a reason when rejecting or hiding', () => {
    expect(UpdateReviewStatusBodySchema.safeParse({ status: 'REJECTED' }).success).toBe(false)
    expect(UpdateReviewStatusBodySchema.safeParse({ status: 'HIDDEN', reason: 'Vi phạm nội dung' }).success).toBe(true)
    expect(UpdateReviewStatusBodySchema.safeParse({ status: 'APPROVED' }).success).toBe(true)
  })
})
