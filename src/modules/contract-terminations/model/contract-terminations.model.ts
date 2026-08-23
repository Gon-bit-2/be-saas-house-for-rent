import z from 'zod'

const StatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELED'])
const DateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày phải có định dạng YYYY-MM-DD')
  .transform((value, context) => {
    const date = new Date(`${value}T00:00:00.000Z`)
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      context.addIssue({ code: 'custom', message: 'Ngày không hợp lệ' })
      return z.NEVER
    }
    return date
  })

export const ListContractTerminationsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: StatusSchema.optional(),
    contractId: z.coerce.number().int().positive().optional(),
    roomId: z.coerce.number().int().positive().optional(),
  })
  .strict()
export const CreateContractTerminationBodySchema = z
  .object({
    contractId: z.coerce.number().int().positive(),
    reason: z.string().trim().min(1).max(5000),
    expectedMoveOutDate: DateOnlySchema,
  })
  .strict()
export const ReviewContractTerminationBodySchema = z.object({ reviewNote: z.string().trim().max(5000).optional() }).strict()
export const EmptyContractTerminationBodySchema = z.object({}).strict()
export const CompleteContractTerminationBodySchema = z
  .object({
    checkoutHandoverId: z.coerce.number().int().positive(),
    actualMoveOutDate: DateOnlySchema,
    acknowledgeOutstandingDebt: z.boolean().default(false),
    completionNote: z.string().trim().max(5000).nullable().optional(),
  })
  .strict()

export type TListContractTerminationsQuery = z.infer<typeof ListContractTerminationsQuerySchema>
export type TCreateContractTerminationBody = z.infer<typeof CreateContractTerminationBodySchema>
export type TReviewContractTerminationBody = z.infer<typeof ReviewContractTerminationBodySchema>
export type TCompleteContractTerminationBody = z.infer<typeof CompleteContractTerminationBodySchema>
