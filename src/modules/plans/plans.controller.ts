import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { IsAdmin } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import { CreatePlanBodyDTO, ListPlansQueryDTO, UpdatePlanBodyDTO } from './dto/plans.dto'
import { PlansService } from './plans.service'

/**
 * Super Admin controller for managing SaaS plans.
 */
@IsAdmin()
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  list(@Query() query: ListPlansQueryDTO) {
    return this.plansService.list(query)
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.plansService.getById(id)
  }

  @Post()
  create(@ActiveUser() user: AccessTokenPayload, @Body() body: CreatePlanBodyDTO) {
    return this.plansService.create(body, user.userId)
  }

  @Patch(':id')
  update(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number, @Body() body: UpdatePlanBodyDTO) {
    return this.plansService.update(id, body, user.userId)
  }
}
