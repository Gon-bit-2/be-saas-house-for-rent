import z from 'zod'
import { IsoDateInputCodec } from '@src/common/utils/date-codec.util'

const ContractStatusSchema = z.enum([
  'DRAFT',
  'WAITING_LANDLORD_SIGN',
  'WAITING_RENTER_SIGN',
  'ACTIVE',
  'EXPIRED',
  'TERMINATED',
  'CANCELED',
])
const ContractBillingCycleSchema = z.enum(['MONTHLY', 'QUARTERLY'])

const CoRenterIdsSchema = z
  .array(z.coerce.number().int().positive())
  .max(20)
  .optional()
  .transform((value) => (value ? Array.from(new Set(value)) : undefined))

export const RenterInfoSchema = z
  .object({
    phone: z.string().trim().max(50).optional().nullable(),
    identityNumber: z.string().trim().max(50).optional().nullable(),
    permanentAddress: z.string().trim().optional().nullable(),
    identityFrontUrl: z.string().trim().optional().nullable(),
    identityBackUrl: z.string().trim().optional().nullable(),
  })
  .strict()

export const ListContractsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: ContractStatusSchema.optional(),
    roomId: z.coerce.number().int().positive().optional(),
    renterId: z.coerce.number().int().positive().optional(),
    propertyId: z.coerce.number().int().positive().optional(),
    search: z.string().trim().optional(),
  })
  .strict()

export const AddContractMemberBodySchema = z
  .object({
    userId: z.coerce.number().int().positive().optional(),
    fullName: z.string().trim().min(1).max(255).optional(),
    phone: z.string().trim().max(50).optional(),
    age: z.coerce.number().int().positive().optional(),
    identityCard: z.string().trim().max(50).optional(),
    identityCardImageUrl: z.string().trim().optional(),
  })
  .strict()
  .refine((data) => data.userId || data.fullName, {
    message: 'Phải chọn người dùng hoặc nhập họ tên',
    path: ['fullName'],
  })

export const CreateContractBodySchema = z
  .object({
    roomId: z.coerce.number().int().positive(),
    renterId: z.coerce.number().int().positive(),
    rentalRequestId: z.coerce.number().int().positive().nullable().optional(),
    templateId: z.coerce.number().int().positive().nullable().optional(),
    contractCode: z.string().trim().min(1).max(100).optional(),
    startDate: IsoDateInputCodec,
    endDate: IsoDateInputCodec,
    monthlyPrice: z.coerce.number().nonnegative(),
    depositAmount: z.coerce.number().nonnegative(),
    billingCycle: ContractBillingCycleSchema,
    paymentDueDay: z.coerce.number().int().min(1).max(28),
    contentSnapshot: z.string().trim().min(1),
    coRenters: z.array(AddContractMemberBodySchema).optional(),
    renterInfo: RenterInfoSchema.optional(),
  })
  .strict()

export const UpdateContractBodySchema = z
  .object({
    startDate: IsoDateInputCodec.optional(),
    endDate: IsoDateInputCodec.optional(),
    monthlyPrice: z.coerce.number().nonnegative().optional(),
    depositAmount: z.coerce.number().nonnegative().optional(),
    billingCycle: ContractBillingCycleSchema.optional(),
    paymentDueDay: z.coerce.number().int().min(1).max(28).optional(),
    contentSnapshot: z.string().trim().min(1).optional(),
    coRenters: z.array(AddContractMemberBodySchema).optional(),
    renterInfo: RenterInfoSchema.optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: 'Cần cung cấp ít nhất một trường để cập nhật' })

export const EmptyContractBodySchema = z.object({}).strict()

export const SignContractBodySchema = z
  .object({
    signature: z.string().trim().min(1, 'Chữ ký không được để trống'),
  })
  .strict()



export type TListContractsQuerySchema = z.infer<typeof ListContractsQuerySchema>
export type TCreateContractBodySchema = z.infer<typeof CreateContractBodySchema>
export type TUpdateContractBodySchema = z.infer<typeof UpdateContractBodySchema>
export type TEmptyContractBodySchema = z.infer<typeof EmptyContractBodySchema>
export type TSignContractBodySchema = z.infer<typeof SignContractBodySchema>
export type TAddContractMemberBodySchema = z.infer<typeof AddContractMemberBodySchema>
export type TRenterInfo = z.infer<typeof RenterInfoSchema>
