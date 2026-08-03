import z from 'zod'
import { IsoDateInputCodec } from '@src/common/utils/date-codec.util'

const RentalRequestStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'NEED_MORE_INFO',
  'CANCELED',
  'CONVERTED_TO_CONTRACT',
])
const RentalRequestDecisionSchema = z.enum(['APPROVED', 'REJECTED', 'NEED_MORE_INFO'])
const AppointmentStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'REJECTED', 'RESCHEDULED', 'CANCELED', 'COMPLETED'])
const AppointmentLandlordStatusSchema = z.enum(['CONFIRMED', 'REJECTED', 'RESCHEDULED', 'CANCELED', 'COMPLETED'])

export const ListRentalRequestsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: RentalRequestStatusSchema.optional(),
    roomId: z.coerce.number().int().positive().optional(),
    propertyId: z.coerce.number().int().positive().optional(),
    search: z.string().trim().min(1).optional(),
  })
  .strict()

export const DecideRentalRequestBodySchema = z
  .object({
    status: RentalRequestDecisionSchema,
  })
  .strict()

export const CancelMyRentalRequestBodySchema = z.object({}).strict()

export const UpdateMyRentalRequestBodySchema = z
  .object({
    expectedStartDate: IsoDateInputCodec.optional(),
    message: z.string().trim().max(2000).nullable().optional(),
    appointmentId: z.coerce.number().int().positive().nullable().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: 'Cần cung cấp ít nhất một trường để cập nhật' })

export const ListViewingAppointmentsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: AppointmentStatusSchema.optional(),
    roomId: z.coerce.number().int().positive().optional(),
    propertyId: z.coerce.number().int().positive().optional(),
    from: IsoDateInputCodec.optional(),
    to: IsoDateInputCodec.optional(),
  })
  .strict()

export const UpdateViewingAppointmentStatusBodySchema = z
  .object({
    status: AppointmentLandlordStatusSchema,
    scheduledAt: IsoDateInputCodec.optional(),
    assignedStaffId: z.coerce.number().int().positive().nullable().optional(),
    landlordNote: z.string().trim().max(2000).nullable().optional(),
  })
  .strict()

export const CancelMyViewingAppointmentBodySchema = z.object({}).strict()

export type TListRentalRequestsQuerySchema = z.infer<typeof ListRentalRequestsQuerySchema>
export type TDecideRentalRequestBodySchema = z.infer<typeof DecideRentalRequestBodySchema>
export type TCancelMyRentalRequestBodySchema = z.infer<typeof CancelMyRentalRequestBodySchema>
export type TUpdateMyRentalRequestBodySchema = z.infer<typeof UpdateMyRentalRequestBodySchema>
export type TListViewingAppointmentsQuerySchema = z.infer<typeof ListViewingAppointmentsQuerySchema>
export type TUpdateViewingAppointmentStatusBodySchema = z.infer<typeof UpdateViewingAppointmentStatusBodySchema>
export type TCancelMyViewingAppointmentBodySchema = z.infer<typeof CancelMyViewingAppointmentBodySchema>
