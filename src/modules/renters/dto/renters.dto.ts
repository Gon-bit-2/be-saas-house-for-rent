import { createZodDto } from 'nestjs-zod'
import { ListRentersQuerySchema, UpdateRenterProfileBodySchema } from '../model/renters.model'

export class ListRentersQueryDTO extends createZodDto(ListRentersQuerySchema) {}
export class UpdateRenterProfileBodyDTO extends createZodDto(UpdateRenterProfileBodySchema) {}
