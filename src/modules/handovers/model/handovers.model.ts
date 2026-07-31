import z from 'zod'

const HandoverTypeSchema = z.enum(['CHECKIN', 'CHECKOUT'])
const HandoverStatusSchema = z.enum(['DRAFT', 'CONFIRMED', 'DISPUTED'])
const AssetConditionSchema = z.enum(['NEW', 'GOOD', 'NORMAL', 'DAMAGED', 'LOST'])

export const HandoverItemSchema = z
  .object({
    roomAssetId: z.coerce.number().int().positive(),
    actualQuantity: z.coerce.number().int().nonnegative().max(10_000),
    condition: AssetConditionSchema,
    note: z.string().trim().max(2000).nullable().optional(),
    imageUrl: z.string().url().max(2000).nullable().optional(),
  })
  .strict()

export const ListHandoversQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    contractId: z.coerce.number().int().positive().optional(),
    roomId: z.coerce.number().int().positive().optional(),
    type: HandoverTypeSchema.optional(),
    status: HandoverStatusSchema.optional(),
  })
  .strict()

export const CreateHandoverBodySchema = z
  .object({
    contractId: z.coerce.number().int().positive(),
    type: HandoverTypeSchema,
    note: z.string().trim().max(5000).nullable().optional(),
    items: z.array(HandoverItemSchema).max(200).optional(),
  })
  .strict()

export const UpdateHandoverBodySchema = z
  .object({
    version: z.coerce.number().int().positive(),
    note: z.string().trim().max(5000).nullable().optional(),
    items: z.array(HandoverItemSchema).max(200).optional(),
  })
  .strict()
  .refine((body) => body.note !== undefined || body.items !== undefined, 'Cần cung cấp nội dung cần cập nhật')

export const ConfirmHandoverBodySchema = z.object({ version: z.coerce.number().int().positive() }).strict()
export const DisputeHandoverBodySchema = z
  .object({ version: z.coerce.number().int().positive(), reason: z.string().trim().min(1).max(5000) })
  .strict()
export const ResolveHandoverBodySchema = z
  .object({
    version: z.coerce.number().int().positive(),
    resolutionNote: z.string().trim().min(1).max(5000),
    note: z.string().trim().max(5000).nullable().optional(),
    items: z.array(HandoverItemSchema).max(200).optional(),
  })
  .strict()

export type THandoverItem = z.infer<typeof HandoverItemSchema>
export type TListHandoversQuery = z.infer<typeof ListHandoversQuerySchema>
export type TCreateHandoverBody = z.infer<typeof CreateHandoverBodySchema>
export type TUpdateHandoverBody = z.infer<typeof UpdateHandoverBodySchema>
export type TConfirmHandoverBody = z.infer<typeof ConfirmHandoverBodySchema>
export type TDisputeHandoverBody = z.infer<typeof DisputeHandoverBodySchema>
export type TResolveHandoverBody = z.infer<typeof ResolveHandoverBodySchema>
