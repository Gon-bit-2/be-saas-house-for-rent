import z from 'zod'

export const ProvinceCodeSchema = z.string().regex(/^\d{2}$/)
export const WardCodeSchema = z.string().regex(/^\d{5}$/)

export const ListWardsQuerySchema = z.object({ provinceCode: ProvinceCodeSchema }).strict()

export const AutocompleteQuerySchema = z
  .object({
    input: z.string().trim().min(2).max(250),
    sessionToken: z.string().trim().min(8).max(200),
    provinceCode: ProvinceCodeSchema,
    wardCode: WardCodeSchema,
  })
  .strict()

export const PlaceDetailQuerySchema = z
  .object({
    placeId: z.string().trim().min(1).max(500),
    sessionToken: z.string().trim().min(8).max(200),
    provinceCode: ProvinceCodeSchema.optional(),
    wardCode: WardCodeSchema.optional(),
  })
  .strict()

export const ReverseGeocodeQuerySchema = z
  .object({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
  })
  .strict()

export type TAutocompleteQuery = z.infer<typeof AutocompleteQuerySchema>
export type TPlaceDetailQuery = z.infer<typeof PlaceDetailQuerySchema>
export type TReverseGeocodeQuery = z.infer<typeof ReverseGeocodeQuerySchema>
