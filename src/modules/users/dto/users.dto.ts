import { createZodDto } from 'nestjs-zod'
import { ListLandlordsQuerySchema, ListRentersQuerySchema, UpdateUserStatusBodySchema } from '../model/users.model'

export class ListLandlordsQueryDTO extends createZodDto(ListLandlordsQuerySchema) {}
export class ListRentersQueryDTO extends createZodDto(ListRentersQuerySchema) {}
export class UpdateUserStatusBodyDTO extends createZodDto(UpdateUserStatusBodySchema) {}
