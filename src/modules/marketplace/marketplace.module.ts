import { Module } from '@nestjs/common'
import { NotificationsModule } from '@src/modules/notifications/notifications.module'
import { MarketplaceController } from './marketplace.controller'
import { MarketplaceAdminController } from './marketplace-admin.controller'
import { MarketplaceAdminService } from './marketplace-admin.service'
import { MarketplaceService } from './marketplace.service'
import { MarketplaceAdminRepository } from './repositories/marketplace-admin.repo'
import { MarketplaceRepository } from './repositories/marketplace.repo'

@Module({
  imports: [NotificationsModule],
  controllers: [MarketplaceController, MarketplaceAdminController],
  providers: [MarketplaceService, MarketplaceRepository, MarketplaceAdminService, MarketplaceAdminRepository],
  exports: [MarketplaceService, MarketplaceRepository],
})
export class MarketplaceModule {}
