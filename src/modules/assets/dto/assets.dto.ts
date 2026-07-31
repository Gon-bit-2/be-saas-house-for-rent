import { createZodDto } from 'nestjs-zod'
import {
  CreateAssetCategoryBodySchema,
  CreateRoomAssetBodySchema,
  ListAssetCategoriesQuerySchema,
  ListRoomAssetsQuerySchema,
  UpdateAssetCategoryBodySchema,
  UpdateRoomAssetBodySchema,
} from '../model/assets.model'

export class ListAssetCategoriesQueryDTO extends createZodDto(ListAssetCategoriesQuerySchema) {}
export class CreateAssetCategoryBodyDTO extends createZodDto(CreateAssetCategoryBodySchema) {}
export class UpdateAssetCategoryBodyDTO extends createZodDto(UpdateAssetCategoryBodySchema) {}
export class ListRoomAssetsQueryDTO extends createZodDto(ListRoomAssetsQuerySchema) {}
export class CreateRoomAssetBodyDTO extends createZodDto(CreateRoomAssetBodySchema) {}
export class UpdateRoomAssetBodyDTO extends createZodDto(UpdateRoomAssetBodySchema) {}
