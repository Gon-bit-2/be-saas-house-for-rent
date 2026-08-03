import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger'
import roleName, { type RoleNameType } from '@src/common/constants/role.constant'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { IsTenant, Roles } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import { ResourceRateLimit } from '@src/common/rate-limit/resource-rate-limit.decorator'
import { ResourceRateLimitGuard } from '@src/common/rate-limit/resource-rate-limit.guard'
import {
  AssignTicketBodyDTO,
  CloseTicketBodyDTO,
  CreateTicketAttachmentBodyDTO,
  CreateTicketBodyDTO,
  CreateTicketCommentBodyDTO,
  ListTicketsQueryDTO,
  TicketRelationsQueryDTO,
  UpdateTicketStatusBodyDTO,
} from './dto/tickets.dto'
import { TicketsService } from './tickets.service'

const ticketFileInterceptor = FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } })

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

  @IsTenant()
  @Patch('me/:id/close')
  closeMine(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.closeMine(user.userId, id)
  }

  @IsTenant()
  @Patch('me/:id/reopen')
  reopenMine(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.reopenMine(user.userId, id)
  }

  @IsTenant()
  @Patch('me/:id/cancel')
  cancelMine(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.cancelMine(user.userId, id)
  }

  @IsTenant()
  @Get('me/:id/history')
  listMyHistory(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: TicketRelationsQueryDTO,
  ) {
    return this.ticketsService.listMyHistory(user.userId, id, query)
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
  @Get(':id/history')
  listStaffHistory(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: TicketRelationsQueryDTO,
  ) {
    return this.ticketsService.listStaffHistory(user.userId, id, query)
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

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Patch(':id/assign')
  assign(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AssignTicketBodyDTO,
  ) {
    return this.ticketsService.assign(user.userId, id, body)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Patch(':id/close')
  closeForStaff(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CloseTicketBodyDTO,
  ) {
    return this.ticketsService.closeForStaff(user.userId, id, body)
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
  @ApiOperation({ deprecated: true, summary: 'Add ticket attachment metadata (deprecated; use multipart upload)' })
  @Post(':id/attachments')
  addAttachment(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateTicketAttachmentBodyDTO,
  ) {
    return this.ticketsService.addAttachment(user.userId, user.roleName as RoleNameType, id, body)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER, roleName.MAINTENANCE_STAFF, roleName.TENANT)
  @ResourceRateLimit('ticket-attachment')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(ticketFileInterceptor)
  @Post(':id/attachments/upload')
  uploadAttachment(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.ticketsService.uploadAttachment(user.userId, user.roleName as RoleNameType, id, file)
  }
}
