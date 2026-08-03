import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common'
import { isPublic } from '@src/common/decorators/decorators/auth.decorator'
import { ListPublicReviewsQueryDTO } from './dto/reviews.dto'
import { ReviewsService } from './reviews.service'

@Controller('marketplace/rooms/:roomId')
export class ReviewsPublicController {
  constructor(private readonly service: ReviewsService) {}

  @isPublic()
  @Get('reviews')
  listPublic(@Param('roomId', ParseIntPipe) roomId: number, @Query() query: ListPublicReviewsQueryDTO) {
    return this.service.listPublic(roomId, query)
  }

  @isPublic()
  @Get('review-summary')
  getSummary(@Param('roomId', ParseIntPipe) roomId: number) {
    return this.service.getSummary(roomId)
  }
}
