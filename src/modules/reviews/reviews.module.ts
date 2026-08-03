import { Module } from '@nestjs/common'
import { NotificationsModule } from '@src/modules/notifications/notifications.module'
import { ReviewsAdminController } from './reviews-admin.controller'
import { ReviewsController } from './reviews.controller'
import { ReviewsPublicController } from './reviews-public.controller'
import { ReviewsService } from './reviews.service'
import { ReviewsRepository } from './repositories/reviews.repo'

@Module({
  imports: [NotificationsModule],
  controllers: [ReviewsController, ReviewsPublicController, ReviewsAdminController],
  providers: [ReviewsService, ReviewsRepository],
})
export class ReviewsModule {}
