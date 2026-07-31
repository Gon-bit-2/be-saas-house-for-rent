import { Module } from '@nestjs/common'
import { SharedServiceModule } from '@src/shared/modules/services/shared-service.module'
import { AssetCategoriesController } from './asset-categories.controller'
import { AssetCategoriesService } from './asset-categories.service'
import { AssetCategoriesRepository } from './repositories/asset-categories.repo'
import { RoomAssetsRepository } from './repositories/room-assets.repo'
import { RoomAssetsController } from './room-assets.controller'
import { RoomAssetsService } from './room-assets.service'

@Module({
  imports: [SharedServiceModule],
  controllers: [AssetCategoriesController, RoomAssetsController],
  providers: [AssetCategoriesService, AssetCategoriesRepository, RoomAssetsService, RoomAssetsRepository],
  exports: [RoomAssetsRepository],
})
export class AssetsModule {}
