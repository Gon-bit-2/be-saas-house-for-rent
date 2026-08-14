import z from 'zod'
import { IsoDateInputCodec } from '@src/common/utils/date-codec.util'

const PropertyTypeSchema = z.enum(['HOUSE', 'MINI_APARTMENT', 'DORM', 'APARTMENT'])

export const ListMarketplaceRoomsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().trim().optional(),
    province: z.string().trim().min(1).max(100).optional(),
    district: z.string().trim().min(1).max(100).optional(),
    ward: z.string().trim().min(1).max(100).optional(),
    propertyType: PropertyTypeSchema.optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    minArea: z.coerce.number().nonnegative().optional(),
    maxArea: z.coerce.number().nonnegative().optional(),
    maxOccupants: z.coerce.number().int().positive().optional(),
    amenityIds: z
      .union([z.string(), z.array(z.coerce.number().int().positive())])
      .optional()
      .transform((value) => {
        if (!value) {
          return undefined
        }
        if (Array.isArray(value)) {
          return Array.from(new Set(value))
        }
        return Array.from(
          new Set(
            value
              .split(',')
              .map((item) => Number(item.trim()))
              .filter((item) => Number.isInteger(item) && item > 0),
          ),
        )
      }),
  })
  .strict()

export const CreateMarketplaceRentalRequestBodySchema = z
  .object({
    expectedStartDate: IsoDateInputCodec,
    message: z.string().trim().max(2000).nullable().optional(),
    appointmentId: z.coerce.number().int().positive().nullable().optional(),
  })
  .strict()

export const CreateMarketplaceViewingAppointmentBodySchema = z
  .object({
    scheduledAt: IsoDateInputCodec,
    note: z.string().trim().max(2000).nullable().optional(),
  })
  .strict()

export type TListMarketplaceRoomsQuerySchema = z.infer<typeof ListMarketplaceRoomsQuerySchema>
export type TCreateMarketplaceRentalRequestBodySchema = z.infer<typeof CreateMarketplaceRentalRequestBodySchema>
export type TCreateMarketplaceViewingAppointmentBodySchema = z.infer<
  typeof CreateMarketplaceViewingAppointmentBodySchema
>
