import { createZodDto } from 'nestjs-zod'
import {
  ListAdminMarketplaceRoomsQuerySchema,
  MarketplaceModerationHistoryQuerySchema,
  UpdateAdminMarketplaceStatusBodySchema,
} from '../model/marketplace-admin.model'

export class ListAdminMarketplaceRoomsQueryDTO extends createZodDto(ListAdminMarketplaceRoomsQuerySchema) {}
export class MarketplaceModerationHistoryQueryDTO extends createZodDto(MarketplaceModerationHistoryQuerySchema) {}
export class UpdateAdminMarketplaceStatusBodyDTO extends createZodDto(UpdateAdminMarketplaceStatusBodySchema) {}
