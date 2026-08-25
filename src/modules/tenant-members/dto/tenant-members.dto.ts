import { createZodDto } from 'nestjs-zod'
import { AddTenantMemberBodySchema, UpdateTenantMemberRoleBodySchema } from '../model/tenant-members.model'

export class AddTenantMemberBodyDTO extends createZodDto(AddTenantMemberBodySchema) {}
export class UpdateTenantMemberRoleBodyDTO extends createZodDto(UpdateTenantMemberRoleBodySchema) {}
