import z from 'zod'
import { IsoDateInputCodec } from '@src/common/utils/date-codec.util'

const OcrJobStatusSchema = z.enum(['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'NEED_REVIEW'])

export const ListOcrJobsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: OcrJobStatusSchema.optional(),
    roomId: z.coerce.number().int().positive().optional(),
    meterId: z.coerce.number().int().positive().optional(),
    from: IsoDateInputCodec.optional(),
    to: IsoDateInputCodec.optional(),
  })
  .strict()

export const CreateOcrJobBodySchema = z.object({ meterId: z.coerce.number().int().positive() }).strict()

export const AcceptOcrJobBodySchema = z
  .object({
    billingMonth: IsoDateInputCodec,
    currentValue: z.coerce.number().nonnegative().optional(),
    previousValue: z.coerce.number().nonnegative().optional(),
    unitPrice: z.coerce.number().nonnegative().optional(),
  })
  .strict()

export type TListOcrJobsQuerySchema = z.infer<typeof ListOcrJobsQuerySchema>
export type TCreateOcrJobBodySchema = z.infer<typeof CreateOcrJobBodySchema>
export type TAcceptOcrJobBodySchema = z.infer<typeof AcceptOcrJobBodySchema>
