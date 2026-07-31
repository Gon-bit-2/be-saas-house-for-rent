import { createZodDto } from 'nestjs-zod'
import { AcceptOcrJobBodySchema, CreateOcrJobBodySchema, ListOcrJobsQuerySchema } from '../model/ocr.model'

export class ListOcrJobsQueryDTO extends createZodDto(ListOcrJobsQuerySchema) {}
export class CreateOcrJobBodyDTO extends createZodDto(CreateOcrJobBodySchema) {}
export class AcceptOcrJobBodyDTO extends createZodDto(AcceptOcrJobBodySchema) {}
