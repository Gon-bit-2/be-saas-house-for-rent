import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { IsTenant } from '@src/common/decorators/decorators/roles.decorator'
import { ResourceRateLimit } from '@src/common/rate-limit/resource-rate-limit.decorator'
import { ResourceRateLimitGuard } from '@src/common/rate-limit/resource-rate-limit.guard'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import { CreateReviewBodyDTO, ListMyReviewsQueryDTO } from './dto/reviews.dto'
import { ReviewsService } from './reviews.service'

@Controller('reviews')
@UseGuards(ResourceRateLimitGuard)
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @IsTenant()
  @ResourceRateLimit('trust-write')
  @Post()
  create(@ActiveUser() user: AccessTokenPayload, @Body() body: CreateReviewBodyDTO) {
    return this.service.create(user.userId, user.roleName, body)
  }

  @IsTenant()
  @Get('me')
  listMine(@ActiveUser() user: AccessTokenPayload, @Query() query: ListMyReviewsQueryDTO) {
    return this.service.listMine(user.userId, query)
  }

  @IsTenant()
  @Get('me/:id')
  getMine(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.getMine(user.userId, id)
  }
}
