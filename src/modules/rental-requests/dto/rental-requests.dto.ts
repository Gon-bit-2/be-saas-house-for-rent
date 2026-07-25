import { createZodDto } from 'nestjs-zod'
import {
  CancelMyRentalRequestBodySchema,
  CancelMyViewingAppointmentBodySchema,
  DecideRentalRequestBodySchema,
  ListRentalRequestsQuerySchema,
  ListViewingAppointmentsQuerySchema,
  UpdateViewingAppointmentStatusBodySchema,
} from '../model/rental-requests.model'

export class ListRentalRequestsQueryDTO extends createZodDto(ListRentalRequestsQuerySchema) {}
export class DecideRentalRequestBodyDTO extends createZodDto(DecideRentalRequestBodySchema) {}
export class CancelMyRentalRequestBodyDTO extends createZodDto(CancelMyRentalRequestBodySchema) {}
export class ListViewingAppointmentsQueryDTO extends createZodDto(ListViewingAppointmentsQuerySchema) {}
export class UpdateViewingAppointmentStatusBodyDTO extends createZodDto(UpdateViewingAppointmentStatusBodySchema) {}
export class CancelMyViewingAppointmentBodyDTO extends createZodDto(CancelMyViewingAppointmentBodySchema) {}
