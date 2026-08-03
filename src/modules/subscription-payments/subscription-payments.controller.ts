import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common'
import roleName from '@src/common/constants/role.constant'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { IsAdmin, Roles } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import {
  CreateSubscriptionCheckoutBodyDTO,
  ListMySubscriptionPaymentsQueryDTO,
  ListSubscriptionPaymentsQueryDTO,
} from './dto/subscription-payments.dto'
import { SubscriptionPaymentsService } from './subscription-payments.service'

@Controller()
export class SubscriptionPaymentsController {
  constructor(private readonly service: SubscriptionPaymentsService) {}

  @Roles(roleName.LANDLORD)
  @Get('subscriptions/me')
  getMine(@ActiveUser() user: AccessTokenPayload) {
    return this.service.getMine(user.userId)
  }

  @Roles(roleName.LANDLORD)
  @Post('subscription-payments/me/payos')
  createCheckout(@ActiveUser() user: AccessTokenPayload, @Body() body: CreateSubscriptionCheckoutBodyDTO) {
    return this.service.createCheckout(user.userId, body)
  }

  @Roles(roleName.LANDLORD)
  @Get('subscription-payments/me')
  listMine(@ActiveUser() user: AccessTokenPayload, @Query() query: ListMySubscriptionPaymentsQueryDTO) {
    return this.service.listMine(user.userId, query)
  }

  @Roles(roleName.LANDLORD)
  @Get('subscription-payments/me/:id')
  getMineById(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.getMineById(user.userId, id)
  }

  @Roles(roleName.LANDLORD)
  @Post('subscription-payments/me/:id/cancel')
  cancel(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.cancel(user.userId, id)
  }

  @IsAdmin()
  @Get('subscription-payments')
  list(@Query() query: ListSubscriptionPaymentsQueryDTO) {
    return this.service.list(query)
  }

  @IsAdmin()
  @Get('subscription-payments/:id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id)
  }
}
