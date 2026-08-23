const http = require('http');
const { z } = require('zod');

const numericValue = z.union([z.number(), z.string()]);
const imageSchema = z.object({
  id: z.number().int(),
  url: z.string().url(),
  caption: z.string().nullish(),
  sortOrder: z.number().int().optional(),
  isThumbnail: z.boolean().optional(),
});
const amenitySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  icon: z.string().nullish(),
  category: z.string(),
});
const roomAmenitySchema = z.union([amenitySchema, z.object({ amenity: amenitySchema })]);
const propertySchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    type: z.enum(['HOUSE', 'MINI_APARTMENT', 'DORM', 'APARTMENT']),
    province: z.string().nullish(),
    provinceCode: z.string().nullish(),
    district: z.string().nullish(),
    ward: z.string().nullish(),
    wardCode: z.string().nullish(),
    addressDetail: z.string().nullish(),
    latitude: numericValue.nullish(),
    longitude: numericValue.nullish(),
  })
  .passthrough();

const marketplaceRoomSchema = z
  .object({
    id: z.number().int(),
    roomCode: z.string(),
    title: z.string(),
    area: numericValue,
    maxOccupants: z.number().int(),
    basePrice: numericValue,
    depositAmount: numericValue.nullish(),
    electricityPrice: numericValue.nullish(),
    waterPrice: numericValue.nullish(),
    description: z.string().nullish(),
    publishedAt: z.string().nullish(),
    property: propertySchema,
    images: z.array(imageSchema).default([]),
    amenities: z.array(roomAmenitySchema).default([]),
    floor: z.object({ id: z.number().int(), name: z.string(), floorNumber: z.number().int() }).nullish(),
    tenant: z.object({ id: z.number().int(), name: z.string(), verificationStatus: z.string().nullish(), createdAt: z.string().nullish() }).nullish(),
  })
  .passthrough();

http.get('http://localhost:1174/marketplace/rooms', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const result = z.array(marketplaceRoomSchema).safeParse(json.data);
      if (!result.success) {
        console.log("Zod Validation Failed!");
        console.log(JSON.stringify(result.error.errors, null, 2));
      } else {
        console.log("Zod Validation Passed!");
      }
    } catch (e) {
      console.log('Error parsing JSON:', e.message);
    }
  });
});
