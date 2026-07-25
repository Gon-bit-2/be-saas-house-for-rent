import { createZodDto } from 'nestjs-zod'
import { CreateAmenityBodySchema, ListAmenitiesQuerySchema, UpdateAmenityBodySchema } from '../model/amenities.model'

export class ListAmenitiesQueryDTO extends createZodDto(ListAmenitiesQuerySchema) {}
export class CreateAmenityBodyDTO extends createZodDto(CreateAmenityBodySchema) {}
export class UpdateAmenityBodyDTO extends createZodDto(UpdateAmenityBodySchema) {}
