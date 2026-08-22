import z from 'zod'
import { IsoDateInputCodec } from '@src/common/utils/date-codec.util'

const ServiceItemTypeSchema = z.enum(['SERVICE', 'PARKING', 'INTERNET', 'OTHER'])
const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isActive: z.coerce.boolean().optional(),
})

export const ListServiceCatalogQuerySchema = PaginationSchema.extend({
  search: z.string().trim().optional(),
}).strict()

export const CreateServiceCatalogItemBodySchema = z
  .object({
    code: z.string().trim().min(1).max(50),
    name: z.string().trim().min(1).max(255),
    description: z.string().trim().max(5000).nullable().optional(),
    itemType: ServiceItemTypeSchema.default('SERVICE'),
    defaultUnitPrice: z.coerce.number().nonnegative(),
    unitLabel: z.string().trim().min(1).max(50).default('tháng'),
    isActive: z.boolean().default(true),
  })
  .strict()

export const UpdateServiceCatalogItemBodySchema = CreateServiceCatalogItemBodySchema.partial().refine(
  (body) => Object.keys(body).length > 0,
  { message: 'Cần cung cấp ít nhất một trường để cập nhật' },
)

export const ListServiceAssignmentsQuerySchema = PaginationSchema.extend({
  serviceItemId: z.coerce.number().int().positive().optional(),
  roomId: z.coerce.number().int().positive().optional(),
  contractId: z.coerce.number().int().positive().optional(),
}).strict()

export const CreateServiceAssignmentBodySchema = z
  .object({
    serviceItemId: z.coerce.number().int().positive(),
    roomId: z.coerce.number().int().positive().nullable().optional(),
    contractId: z.coerce.number().int().positive().nullable().optional(),
    quantity: z.coerce.number().positive().default(1),
    unitPrice: z.coerce.number().nonnegative().nullable().optional(),
    startsAt: IsoDateInputCodec.nullable().optional(),
    endsAt: IsoDateInputCodec.nullable().optional(),
    isActive: z.boolean().default(true),
  })
  .strict()
  .superRefine((body, ctx) => {
    if (Boolean(body.roomId) === Boolean(body.contractId)) {
      ctx.addIssue({ code: 'custom', message: 'Phải gán phí cho đúng một phòng hoặc một hợp đồng', path: ['roomId'] })
    }
    if (body.startsAt && body.endsAt && body.endsAt < body.startsAt) {
      ctx.addIssue({ code: 'custom', message: 'Ngày kết thúc không được trước ngày bắt đầu', path: ['endsAt'] })
    }
  })

export const UpdateServiceAssignmentBodySchema = z
  .object({
    serviceItemId: z.coerce.number().int().positive().optional(),
    roomId: z.coerce.number().int().positive().nullable().optional(),
    contractId: z.coerce.number().int().positive().nullable().optional(),
    quantity: z.coerce.number().positive().optional(),
    unitPrice: z.coerce.number().nonnegative().nullable().optional(),
    startsAt: IsoDateInputCodec.nullable().optional(),
    endsAt: IsoDateInputCodec.nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: 'Cần cung cấp ít nhất một trường để cập nhật' })

export type TListServiceCatalogQuery = z.infer<typeof ListServiceCatalogQuerySchema>
export type TCreateServiceCatalogItemBody = z.infer<typeof CreateServiceCatalogItemBodySchema>
export type TUpdateServiceCatalogItemBody = z.infer<typeof UpdateServiceCatalogItemBodySchema>
export type TListServiceAssignmentsQuery = z.infer<typeof ListServiceAssignmentsQuerySchema>
export type TCreateServiceAssignmentBody = z.infer<typeof CreateServiceAssignmentBodySchema>
export type TUpdateServiceAssignmentBody = z.infer<typeof UpdateServiceAssignmentBodySchema>
