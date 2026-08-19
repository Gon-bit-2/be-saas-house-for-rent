import { createZodDto } from 'nestjs-zod'
import {
  CreateMarketplaceRentalRequestBodySchema,
  CreateMarketplaceViewingAppointmentBodySchema,
  ListMarketplaceAmenitiesQuerySchema,
  ListMarketplaceRoomsQuerySchema,
} from '../model/marketplace.model'

export class ListMarketplaceRoomsQueryDTO extends createZodDto(ListMarketplaceRoomsQuerySchema) {}
export class ListMarketplaceAmenitiesQueryDTO extends createZodDto(ListMarketplaceAmenitiesQuerySchema) {}
export class CreateMarketplaceRentalRequestBodyDTO extends createZodDto(CreateMarketplaceRentalRequestBodySchema) {}
export class CreateMarketplaceViewingAppointmentBodyDTO extends createZodDto(
  CreateMarketplaceViewingAppointmentBodySchema,
) {}
