import { createZodDto } from 'nestjs-zod'
import {
  AutocompleteQuerySchema,
  ListWardsQuerySchema,
  PlaceDetailQuerySchema,
  ReverseGeocodeQuerySchema,
} from '../model/locations.model'

export class ListWardsQueryDTO extends createZodDto(ListWardsQuerySchema) {}
export class AutocompleteQueryDTO extends createZodDto(AutocompleteQuerySchema) {}
export class PlaceDetailQueryDTO extends createZodDto(PlaceDetailQuerySchema) {}
export class ReverseGeocodeQueryDTO extends createZodDto(ReverseGeocodeQuerySchema) {}
