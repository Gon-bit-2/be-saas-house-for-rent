import { createZodDto } from 'nestjs-zod'
import {
  CancelMyRentalRequestBodySchema,
  CancelMyViewingAppointmentBodySchema,
  DecideRentalRequestBodySchema,
  ListRentalRequestsQuerySchema,
  ListViewingAppointmentsQuerySchema,
  UpdateViewingAppointmentStatusBodySchema,
  UpdateMyRentalRequestBodySchema,
} from '../model/rental-requests.model'

export class ListRentalRequestsQueryDTO extends createZodDto(ListRentalRequestsQuerySchema) {}
export class DecideRentalRequestBodyDTO extends createZodDto(DecideRentalRequestBodySchema) {}
export class CancelMyRentalRequestBodyDTO extends createZodDto(CancelMyRentalRequestBodySchema) {}
export class UpdateMyRentalRequestBodyDTO extends createZodDto(UpdateMyRentalRequestBodySchema) {}
export class ListViewingAppointmentsQueryDTO extends createZodDto(ListViewingAppointmentsQuerySchema) {}
export class UpdateViewingAppointmentStatusBodyDTO extends createZodDto(UpdateViewingAppointmentStatusBodySchema) {}
export class CancelMyViewingAppointmentBodyDTO extends createZodDto(CancelMyViewingAppointmentBodySchema) {}
