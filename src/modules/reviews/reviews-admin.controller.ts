import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { IsAdmin } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import { ListAdminReviewsQueryDTO, UpdateReviewStatusBodyDTO } from './dto/reviews.dto'
import { ReviewsService } from './reviews.service'

@IsAdmin()
@Controller('reviews/admin')
export class ReviewsAdminController {
  constructor(private readonly service: ReviewsService) {}

  @Get()
  list(@Query() query: ListAdminReviewsQueryDTO) {
    return this.service.list(query)
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id)
  }

  @Patch(':id/status')
  updateStatus(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateReviewStatusBodyDTO,
  ) {
    return this.service.updateStatus(user.userId, id, body)
  }
}
