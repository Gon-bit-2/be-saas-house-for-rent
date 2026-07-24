import { createZodDto } from 'nestjs-zod'
import {
  CreateMeterReadingBodySchema,
  CreateUtilityMeterBodySchema,
  ListMeterReadingsQuerySchema,
  ListUtilityMetersQuerySchema,
  UpdateMeterReadingBodySchema,
  UpdateMeterReadingStatusBodySchema,
  UpdateUtilityMeterBodySchema,
  UpdateUtilityMeterStatusBodySchema,
} from '../model/utility-meters.model'

export class ListUtilityMetersQueryDTO extends createZodDto(ListUtilityMetersQuerySchema) {}
export class CreateUtilityMeterBodyDTO extends createZodDto(CreateUtilityMeterBodySchema) {}
export class UpdateUtilityMeterBodyDTO extends createZodDto(UpdateUtilityMeterBodySchema) {}
export class UpdateUtilityMeterStatusBodyDTO extends createZodDto(UpdateUtilityMeterStatusBodySchema) {}
export class ListMeterReadingsQueryDTO extends createZodDto(ListMeterReadingsQuerySchema) {}
export class CreateMeterReadingBodyDTO extends createZodDto(CreateMeterReadingBodySchema) {}
export class UpdateMeterReadingBodyDTO extends createZodDto(UpdateMeterReadingBodySchema) {}
export class UpdateMeterReadingStatusBodyDTO extends createZodDto(UpdateMeterReadingStatusBodySchema) {}
