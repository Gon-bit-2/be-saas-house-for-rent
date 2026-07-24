import z from 'zod'

const MeterTypeSchema = z.enum(['ELECTRICITY', 'WATER'])
const MeterStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'BROKEN'])
const ReadingStatusSchema = z.enum(['DRAFT', 'CONFIRMED', 'ABNORMAL', 'REJECTED'])

export const ListUtilityMetersQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    roomId: z.coerce.number().int().positive().optional(),
    propertyId: z.coerce.number().int().positive().optional(),
    type: MeterTypeSchema.optional(),
    status: MeterStatusSchema.optional(),
  })
  .strict()

export const CreateUtilityMeterBodySchema = z
  .object({
    roomId: z.coerce.number().int().positive(),
    type: MeterTypeSchema,
    meterCode: z.string().trim().min(1).max(100),
    unit: z.string().trim().min(1).max(20).optional(),
    status: MeterStatusSchema.default('ACTIVE'),
  })
  .strict()

export const UpdateUtilityMeterBodySchema = z
  .object({
    meterCode: z.string().trim().min(1).max(100).optional(),
    unit: z.string().trim().min(1).max(20).optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: 'Cần cung cấp ít nhất một trường để cập nhật' })

export const UpdateUtilityMeterStatusBodySchema = z.object({ status: MeterStatusSchema }).strict()

export const ListMeterReadingsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    billingMonth: z.coerce.date().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    roomId: z.coerce.number().int().positive().optional(),
    meterId: z.coerce.number().int().positive().optional(),
    type: MeterTypeSchema.optional(),
    status: ReadingStatusSchema.optional(),
  })
  .strict()

export const CreateMeterReadingBodySchema = z
  .object({
    meterId: z.coerce.number().int().positive(),
    billingMonth: z.coerce.date(),
    currentValue: z.coerce.number().nonnegative(),
    previousValue: z.coerce.number().nonnegative().optional(),
    unitPrice: z.coerce.number().nonnegative().optional(),
    imageUrl: z.string().trim().url().nullable().optional(),
    status: ReadingStatusSchema.default('DRAFT'),
  })
  .strict()

export const UpdateMeterReadingBodySchema = z
  .object({
    currentValue: z.coerce.number().nonnegative().optional(),
    previousValue: z.coerce.number().nonnegative().optional(),
    unitPrice: z.coerce.number().nonnegative().optional(),
    imageUrl: z.string().trim().url().nullable().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: 'Cần cung cấp ít nhất một trường để cập nhật' })

export const UpdateMeterReadingStatusBodySchema = z.object({ status: ReadingStatusSchema }).strict()

export type TListUtilityMetersQuerySchema = z.infer<typeof ListUtilityMetersQuerySchema>
export type TCreateUtilityMeterBodySchema = z.infer<typeof CreateUtilityMeterBodySchema>
export type TUpdateUtilityMeterBodySchema = z.infer<typeof UpdateUtilityMeterBodySchema>
export type TUpdateUtilityMeterStatusBodySchema = z.infer<typeof UpdateUtilityMeterStatusBodySchema>
export type TListMeterReadingsQuerySchema = z.infer<typeof ListMeterReadingsQuerySchema>
export type TCreateMeterReadingBodySchema = z.infer<typeof CreateMeterReadingBodySchema>
export type TUpdateMeterReadingBodySchema = z.infer<typeof UpdateMeterReadingBodySchema>
export type TUpdateMeterReadingStatusBodySchema = z.infer<typeof UpdateMeterReadingStatusBodySchema>
