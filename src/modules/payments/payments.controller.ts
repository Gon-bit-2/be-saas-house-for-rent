import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import { Auth } from '@src/common/decorators/decorators/auth.decorator'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { IsTenant, Roles } from '@src/common/decorators/decorators/roles.decorator'
import { AuthType } from '@src/common/constants/auth.constant'
import roleName from '@src/common/constants/role.constant'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import {
  CreatePaymentQrBodyDTO,
  ListPaymentsQueryDTO,
  PayosWebhookBodyDTO,
  ReviewPaymentBodyDTO,
  SubmitPaymentConfirmationBodyDTO,
} from './dto/payments.dto'
import { PaymentsService } from './payments.service'

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @IsTenant()
  @Get('payments/me')
  listMine(@ActiveUser() user: AccessTokenPayload, @Query() query: ListPaymentsQueryDTO) {
    return this.paymentsService.listMine(user.userId, query)
  }

  @IsTenant()
  @Get('payments/me/:id')
  getMine(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.getMine(user.userId, id)
  }

  @IsTenant()
  @Get('invoices/me/:id/payment-qr')
  getMyPaymentQr(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.getMyPaymentQr(user.userId, id)
  }

  @IsTenant()
  @Post('invoices/me/:id/payment-qr')
  createMyPaymentQr(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() _body: CreatePaymentQrBodyDTO,
  ) {
    void _body
    return this.paymentsService.createMyPaymentQr(user.userId, id)
  }

  @IsTenant()
  @Post('invoices/me/:id/payment-confirmations')
  submitMyConfirmation(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SubmitPaymentConfirmationBodyDTO,
  ) {
    return this.paymentsService.submitMyConfirmation(user.userId, id, body)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER, roleName.ACCOUNTANT)
  @Get('payments')
  listForLandlord(@ActiveUser() user: AccessTokenPayload, @Query() query: ListPaymentsQueryDTO) {
    return this.paymentsService.listForLandlord(user.userId, query)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER, roleName.ACCOUNTANT)
  @Get('payments/:id')
  getForLandlord(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.getForLandlord(user.userId, id)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER, roleName.ACCOUNTANT)
  @Patch('payments/:id/approve')
  approve(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ReviewPaymentBodyDTO,
  ) {
    return this.paymentsService.approve(user.userId, id, body)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER, roleName.ACCOUNTANT)
  @Patch('payments/:id/reject')
  reject(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ReviewPaymentBodyDTO,
  ) {
    return this.paymentsService.reject(user.userId, id, body)
  }

  @Auth(AuthType.None)
  @Post('payment-webhooks/payos')
  handlePayosWebhook(@Body() body: PayosWebhookBodyDTO) {
    return this.paymentsService.handlePayosWebhook(body)
  }
}
