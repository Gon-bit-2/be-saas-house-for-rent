import { createZodDto } from 'nestjs-zod'
import {
  CreateFloorBodySchema,
  CreatePropertyBodySchema,
  ListPropertiesQuerySchema,
  UpdateFloorBodySchema,
  UpdatePropertyBodySchema,
  UpdatePropertyStatusBodySchema,
} from '../model/properties.model'

export class ListPropertiesQueryDTO extends createZodDto(ListPropertiesQuerySchema) {}
export class CreatePropertyBodyDTO extends createZodDto(CreatePropertyBodySchema) {}
export class UpdatePropertyBodyDTO extends createZodDto(UpdatePropertyBodySchema) {}
export class UpdatePropertyStatusBodyDTO extends createZodDto(UpdatePropertyStatusBodySchema) {}
export class CreateFloorBodyDTO extends createZodDto(CreateFloorBodySchema) {}
export class UpdateFloorBodyDTO extends createZodDto(UpdateFloorBodySchema) {}
