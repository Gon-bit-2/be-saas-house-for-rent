import { createZodDto } from 'nestjs-zod'
import {
  CreateRoomBodySchema,
  ListRoomsQuerySchema,
  ReplaceRoomAmenitiesBodySchema,
  UpdateRoomBodySchema,
  UpdateRoomImageBodySchema,
  UpdateRoomMarketplaceBodySchema,
  UpdateRoomStatusBodySchema,
} from '../model/rooms.model'

export class ListRoomsQueryDTO extends createZodDto(ListRoomsQuerySchema) {}
export class CreateRoomBodyDTO extends createZodDto(CreateRoomBodySchema) {}
export class UpdateRoomBodyDTO extends createZodDto(UpdateRoomBodySchema) {}
export class UpdateRoomStatusBodyDTO extends createZodDto(UpdateRoomStatusBodySchema) {}
export class UpdateRoomMarketplaceBodyDTO extends createZodDto(UpdateRoomMarketplaceBodySchema) {}
export class ReplaceRoomAmenitiesBodyDTO extends createZodDto(ReplaceRoomAmenitiesBodySchema) {}
export class UpdateRoomImageBodyDTO extends createZodDto(UpdateRoomImageBodySchema) {}
