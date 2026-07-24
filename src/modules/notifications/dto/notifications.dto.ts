import { createZodDto } from 'nestjs-zod'
import {
  EmptyNotificationBodySchema,
  ListNotificationsQuerySchema,
  RegisterDeviceTokenBodySchema,
} from '../model/notifications.model'

export class ListNotificationsQueryDTO extends createZodDto(ListNotificationsQuerySchema) {}
export class RegisterDeviceTokenBodyDTO extends createZodDto(RegisterDeviceTokenBodySchema) {}
export class EmptyNotificationBodyDTO extends createZodDto(EmptyNotificationBodySchema) {}
