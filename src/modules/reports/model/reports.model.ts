import z from 'zod'
import { IsoDateInputCodec } from '@src/common/utils/date-codec.util'

const ReportStatusSchema = z.enum(['PENDING', 'REVIEWING', 'RESOLVED', 'REJECTED'])
const ReportTargetTypeSchema = z.enum(['ROOM', 'TENANT', 'REVIEW', 'USER'])

export const CreateReportBodySchema = z
  .object({
    targetType: ReportTargetTypeSchema,
    targetId: z.coerce.string().trim().regex(/^\d+$/, 'ID đối tượng không hợp lệ').max(50),
    reason: z.string().trim().min(3).max(255),
    description: z.string().trim().min(1).max(5000).optional(),
  })
  .strict()

export const ListMyReportsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: ReportStatusSchema.optional(),
    targetType: ReportTargetTypeSchema.optional(),
  })
  .strict()

export const ListAdminReportsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: ReportStatusSchema.optional(),
    targetType: ReportTargetTypeSchema.optional(),
    reporterId: z.coerce.number().int().positive().optional(),
    handledBy: z.coerce.number().int().positive().optional(),
    from: IsoDateInputCodec.optional(),
    to: IsoDateInputCodec.optional(),
    search: z.string().trim().min(1).max(255).optional(),
  })
  .strict()

export const UpdateReportStatusBodySchema = z
  .object({
    status: z.enum(['REVIEWING', 'RESOLVED', 'REJECTED']),
    resolutionNote: z.string().trim().min(3).max(3000).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (['RESOLVED', 'REJECTED'].includes(value.status) && !value.resolutionNote) {
      ctx.addIssue({ code: 'custom', path: ['resolutionNote'], message: 'Kết luận xử lý là bắt buộc' })
    }
  })

export type TCreateReportBody = z.infer<typeof CreateReportBodySchema>
export type TListMyReportsQuery = z.infer<typeof ListMyReportsQuerySchema>
export type TListAdminReportsQuery = z.infer<typeof ListAdminReportsQuerySchema>
export type TUpdateReportStatusBody = z.infer<typeof UpdateReportStatusBodySchema>
