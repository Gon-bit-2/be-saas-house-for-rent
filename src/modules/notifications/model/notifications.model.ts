import z from 'zod'

const NotificationTypeSchema = z.enum(['INVOICE', 'PAYMENT', 'CONTRACT', 'TICKET', 'APPOINTMENT', 'SYSTEM'])
const DevicePlatformSchema = z.enum(['IOS', 'ANDROID', 'WEB'])

export const ListNotificationsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    type: NotificationTypeSchema.optional(),
    isRead: z.coerce.boolean().optional(),
  })
  .strict()

export const RegisterDeviceTokenBodySchema = z
  .object({
    token: z.string().trim().min(1).max(5000),
    fid: z.string().trim().min(1).max(255).optional(),
    platform: DevicePlatformSchema,
    deviceName: z.string().trim().min(1).max(100).optional(),
  })
  .strict()

export const EmptyNotificationBodySchema = z.object({}).strict()

export type TListNotificationsQuerySchema = z.infer<typeof ListNotificationsQuerySchema>
export type TRegisterDeviceTokenBodySchema = z.infer<typeof RegisterDeviceTokenBodySchema>
