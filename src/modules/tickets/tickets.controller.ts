import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import roleName, { type RoleNameType } from '@src/common/constants/role.constant'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { IsTenant, Roles } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import { ResourceRateLimit } from '@src/common/rate-limit/resource-rate-limit.decorator'
import { ResourceRateLimitGuard } from '@src/common/rate-limit/resource-rate-limit.guard'
import {
  AssignTicketBodyDTO,
  CreateTicketAttachmentBodyDTO,
  CreateTicketBodyDTO,
  CreateTicketCommentBodyDTO,
  ListTicketsQueryDTO,
  TicketRelationsQueryDTO,
  UpdateTicketStatusBodyDTO,
} from './dto/tickets.dto'
import { TicketsService } from './tickets.service'

@Controller('tickets')
@UseGuards(ResourceRateLimitGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @IsTenant()
  @ResourceRateLimit('ticket-create')
  @Post()
  create(@ActiveUser() user: AccessTokenPayload, @Body() body: CreateTicketBodyDTO) {
    return this.ticketsService.create(user.userId, body)
  }

  @IsTenant()
  @Get('me')
  listMine(@ActiveUser() user: AccessTokenPayload, @Query() query: ListTicketsQueryDTO) {
    return this.ticketsService.listMine(user.userId, query)
  }

  @IsTenant()
  @Get('me/:id')
  getMine(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.getMine(user.userId, id)
  }

  @IsTenant()
  @Get('me/:id/comments')
  listMyComments(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: TicketRelationsQueryDTO,
  ) {
    return this.ticketsService.listMyComments(user.userId, id, query)
  }

  @IsTenant()
  @Get('me/:id/attachments')
  listMyAttachments(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: TicketRelationsQueryDTO,
  ) {
    return this.ticketsService.listMyAttachments(user.userId, id, query)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER, roleName.MAINTENANCE_STAFF)
  @Get()
  listForLandlord(@ActiveUser() user: AccessTokenPayload, @Query() query: ListTicketsQueryDTO) {
    return this.ticketsService.listForLandlord(user.userId, query)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER, roleName.MAINTENANCE_STAFF)
  @Get(':id')
  getForLandlord(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.getForLandlord(user.userId, id)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER, roleName.MAINTENANCE_STAFF)
  @Get(':id/comments')
  listStaffComments(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: TicketRelationsQueryDTO,
  ) {
    return this.ticketsService.listStaffComments(user.userId, id, query)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER, roleName.MAINTENANCE_STAFF)
  @Get(':id/attachments')
  listStaffAttachments(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: TicketRelationsQueryDTO,
  ) {
    return this.ticketsService.listStaffAttachments(user.userId, id, query)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER, roleName.MAINTENANCE_STAFF)
  @Patch(':id/status')
  updateStatus(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTicketStatusBodyDTO,
  ) {
    return this.ticketsService.updateStatus(user.userId, id, body)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER, roleName.MAINTENANCE_STAFF)
  @Patch(':id/assign')
  assign(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AssignTicketBodyDTO,
  ) {
    return this.ticketsService.assign(user.userId, id, body)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER, roleName.MAINTENANCE_STAFF, roleName.TENANT)
  @ResourceRateLimit('ticket-comment')
  @Post(':id/comments')
  addComment(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateTicketCommentBodyDTO,
  ) {
    return this.ticketsService.addComment(user.userId, user.roleName as RoleNameType, id, body)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER, roleName.MAINTENANCE_STAFF, roleName.TENANT)
  @ResourceRateLimit('ticket-attachment')
  @Post(':id/attachments')
  addAttachment(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateTicketAttachmentBodyDTO,
  ) {
    return this.ticketsService.addAttachment(user.userId, user.roleName as RoleNameType, id, body)
  }
}
