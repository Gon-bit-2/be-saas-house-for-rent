import { UserStatus } from '@src/common/constants/auth.constant'
import z from 'zod'

export const ListLandlordsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().trim().optional(),
    status: z.enum(UserStatus).optional(),
  })
  .strict()

export const ListRentersQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().trim().optional(),
    status: z.enum(UserStatus).optional(),
  })
  .strict()

export const UpdateUserStatusBodySchema = z
  .object({
    status: z.enum(UserStatus),
    reason: z.string().trim().min(3).max(500),
  })
  .strict()

export type TListLandlordsQuerySchema = z.infer<typeof ListLandlordsQuerySchema>
export type TListRentersQuerySchema = z.infer<typeof ListRentersQuerySchema>
export type TUpdateUserStatusBodySchema = z.infer<typeof UpdateUserStatusBodySchema>
