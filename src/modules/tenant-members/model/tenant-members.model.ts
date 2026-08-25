import z from 'zod'

export const AddTenantMemberBodySchema = z
  .object({
    email: z.string().email(),
    fullName: z.string().trim().min(1).max(255),
    roleId: z.string().trim().min(1).max(50),
  })
  .strict()

export const UpdateTenantMemberRoleBodySchema = z
  .object({
    roleId: z.string().trim().min(1).max(50),
  })
  .strict()

export type TAddTenantMemberBodySchema = z.infer<typeof AddTenantMemberBodySchema>
export type TUpdateTenantMemberRoleBodySchema = z.infer<typeof UpdateTenantMemberRoleBodySchema>
