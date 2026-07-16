import { createZodDto } from 'nestjs-zod'
import { CreatePlanBodySchema, ListPlansQuerySchema, UpdatePlanBodySchema } from '../model/plans.model'

export class ListPlansQueryDTO extends createZodDto(ListPlansQuerySchema) {}
export class CreatePlanBodyDTO extends createZodDto(CreatePlanBodySchema) {}
export class UpdatePlanBodyDTO extends createZodDto(UpdatePlanBodySchema) {}
