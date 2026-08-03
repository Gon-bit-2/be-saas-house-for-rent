import { createZodDto } from 'nestjs-zod'
import {
  CreateMarketplaceRentalRequestBodySchema,
  CreateMarketplaceViewingAppointmentBodySchema,
  ListMarketplaceRoomsQuerySchema,
} from '../model/marketplace.model'

export class ListMarketplaceRoomsQueryDTO extends createZodDto(ListMarketplaceRoomsQuerySchema) {}
export class CreateMarketplaceRentalRequestBodyDTO extends createZodDto(CreateMarketplaceRentalRequestBodySchema) {}
export class CreateMarketplaceViewingAppointmentBodyDTO extends createZodDto(
  CreateMarketplaceViewingAppointmentBodySchema,
) {}
