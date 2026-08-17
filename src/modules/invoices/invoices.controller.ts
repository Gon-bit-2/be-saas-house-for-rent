import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import roleName from '@src/common/constants/role.constant'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { IsTenant, Roles } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import { CreateInvoiceBodyDTO, ListDebtsQueryDTO, ListInvoicesQueryDTO, UpdateInvoiceBodyDTO } from './dto/invoices.dto'
import { InvoicesService } from './invoices.service'

/**
 * Controller for monthly invoices and debt ledger queries.
 */
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @IsTenant()
  @Get('me')
  listMine(@ActiveUser() user: AccessTokenPayload, @Query() query: ListInvoicesQueryDTO) {
    return this.invoicesService.listMine(user.userId, query)
  }

  @IsTenant()
  @Get('me/:id')
  getMine(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.getMine(user.userId, id)
  }

  @IsTenant()
  @Get('debts/me')
  listMyDebts(@ActiveUser() user: AccessTokenPayload, @Query() query: ListDebtsQueryDTO) {
    return this.invoicesService.listMyDebts(user.userId, query)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER, roleName.ACCOUNTANT)
  @Get('debts')
  listDebts(@ActiveUser() user: AccessTokenPayload, @Query() query: ListDebtsQueryDTO) {
    return this.invoicesService.listDebts(user.userId, query)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER, roleName.ACCOUNTANT)
  @Get()
  listForLandlord(@ActiveUser() user: AccessTokenPayload, @Query() query: ListInvoicesQueryDTO) {
    return this.invoicesService.listForLandlord(user.userId, query)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER, roleName.ACCOUNTANT)
  @Get(':id')
  getForLandlord(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.getForLandlord(user.userId, id)
  }
  @Roles(roleName.LANDLORD, roleName.MANAGER, roleName.ACCOUNTANT)
  @Post('preview')
  preview(@ActiveUser() user: AccessTokenPayload, @Body() body: CreateInvoiceBodyDTO) {
    return this.invoicesService.preview(user.userId, body)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER, roleName.ACCOUNTANT)
  @Post()
  create(@ActiveUser() user: AccessTokenPayload, @Body() body: CreateInvoiceBodyDTO) {
    return this.invoicesService.create(user.userId, body)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER, roleName.ACCOUNTANT)
  @Patch(':id')
  updateDraft(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateInvoiceBodyDTO,
  ) {
    return this.invoicesService.updateDraft(user.userId, id, body)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER, roleName.ACCOUNTANT)
  @Patch(':id/issue')
  issue(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.issue(user.userId, id)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER, roleName.ACCOUNTANT)
  @Patch(':id/cancel')
  cancel(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.cancel(user.userId, id)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER, roleName.ACCOUNTANT)
  @Patch(':id/overdue')
  markOverdue(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.markOverdue(user.userId, id)
  }
}
