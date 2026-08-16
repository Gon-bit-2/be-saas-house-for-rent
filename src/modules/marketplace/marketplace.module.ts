import { Module } from '@nestjs/common'
import { NotificationsModule } from '@src/modules/notifications/notifications.module'
import { MarketplaceController } from './marketplace.controller'
import { MarketplaceAdminController } from './marketplace-admin.controller'
import { MarketplaceAdminService } from './marketplace-admin.service'
import { MarketplaceService } from './marketplace.service'
import { MarketplaceAdminRepository } from './repositories/marketplace-admin.repo'
import { MarketplaceRepository } from './repositories/marketplace.repo'
import { FavoriteController } from './favorite.controller'
import { FavoriteService } from './favorite.service'
import { ViewLogController } from './view-log.controller'
import { ViewLogService } from './view-log.service'

@Module({
  imports: [NotificationsModule],
  controllers: [MarketplaceController, MarketplaceAdminController, FavoriteController, ViewLogController],
  providers: [
    MarketplaceService,
    MarketplaceRepository,
    MarketplaceAdminService,
    MarketplaceAdminRepository,
    FavoriteService,
    ViewLogService,
  ],
  exports: [MarketplaceService, MarketplaceRepository, FavoriteService, ViewLogService],
})
export class MarketplaceModule {}
