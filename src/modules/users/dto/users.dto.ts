import { createZodDto } from 'nestjs-zod'
import { ListLandlordsQuerySchema, UpdateUserStatusBodySchema } from '../model/users.model'

export class ListLandlordsQueryDTO extends createZodDto(ListLandlordsQuerySchema) {}
export class UpdateUserStatusBodyDTO extends createZodDto(UpdateUserStatusBodySchema) {}
