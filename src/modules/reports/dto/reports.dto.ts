import { createZodDto } from 'nestjs-zod'
import {
  CreateReportBodySchema,
  ListAdminReportsQuerySchema,
  ListMyReportsQuerySchema,
  UpdateReportStatusBodySchema,
} from '../model/reports.model'

export class CreateReportBodyDTO extends createZodDto(CreateReportBodySchema) {}
export class ListMyReportsQueryDTO extends createZodDto(ListMyReportsQuerySchema) {}
export class ListAdminReportsQueryDTO extends createZodDto(ListAdminReportsQuerySchema) {}
export class UpdateReportStatusBodyDTO extends createZodDto(UpdateReportStatusBodySchema) {}
