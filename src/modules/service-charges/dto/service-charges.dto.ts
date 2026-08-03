import { createZodDto } from 'nestjs-zod'
import {
  CreateServiceAssignmentBodySchema,
  CreateServiceCatalogItemBodySchema,
  ListServiceAssignmentsQuerySchema,
  ListServiceCatalogQuerySchema,
  UpdateServiceAssignmentBodySchema,
  UpdateServiceCatalogItemBodySchema,
} from '../model/service-charges.model'

export class ListServiceCatalogQueryDTO extends createZodDto(ListServiceCatalogQuerySchema) {}
export class CreateServiceCatalogItemBodyDTO extends createZodDto(CreateServiceCatalogItemBodySchema) {}
export class UpdateServiceCatalogItemBodyDTO extends createZodDto(UpdateServiceCatalogItemBodySchema) {}
export class ListServiceAssignmentsQueryDTO extends createZodDto(ListServiceAssignmentsQuerySchema) {}
export class CreateServiceAssignmentBodyDTO extends createZodDto(CreateServiceAssignmentBodySchema) {}
export class UpdateServiceAssignmentBodyDTO extends createZodDto(UpdateServiceAssignmentBodySchema) {}
