import { createZodDto } from 'nestjs-zod'
import {
  AssignTenantPlanBodySchema,
  CreateTenantBodySchema,
  ListTenantsQuerySchema,
  UpdateTenantBodySchema,
  UpdateTenantStatusBodySchema,
  UpdateTenantVerificationBodySchema,
} from '../model/tenants.model'

export class ListTenantsQueryDTO extends createZodDto(ListTenantsQuerySchema) {}
export class CreateTenantBodyDTO extends createZodDto(CreateTenantBodySchema) {}
export class UpdateTenantBodyDTO extends createZodDto(UpdateTenantBodySchema) {}
export class UpdateTenantStatusBodyDTO extends createZodDto(UpdateTenantStatusBodySchema) {}
export class UpdateTenantVerificationBodyDTO extends createZodDto(UpdateTenantVerificationBodySchema) {}
export class AssignTenantPlanBodyDTO extends createZodDto(AssignTenantPlanBodySchema) {}
