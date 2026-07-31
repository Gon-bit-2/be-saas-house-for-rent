import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import roleName from '@src/common/constants/role.constant'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { IsTenant, Roles } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import {
  ConfirmHandoverBodyDTO,
  CreateHandoverBodyDTO,
  DisputeHandoverBodyDTO,
  ListHandoversQueryDTO,
  ResolveHandoverBodyDTO,
  UpdateHandoverBodyDTO,
} from './dto/handovers.dto'
import { HandoversService } from './handovers.service'

@Controller('handovers')
export class HandoversController {
  constructor(private readonly service: HandoversService) {}

  @IsTenant()
  @Get('me')
  listMine(@ActiveUser() user: AccessTokenPayload, @Query() query: ListHandoversQueryDTO) {
    return this.service.listMine(user.userId, query)
  }

  @IsTenant()
  @Get('me/:id')
  getMine(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.getMine(user.userId, id)
  }

  @IsTenant()
  @Patch('me/:id/confirm')
  confirmMine(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ConfirmHandoverBodyDTO,
  ) {
    return this.service.confirmMine(user.userId, id, body)
  }

  @IsTenant()
  @Patch('me/:id/dispute')
  disputeMine(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: DisputeHandoverBodyDTO,
  ) {
    return this.service.disputeMine(user.userId, id, body)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Get()
  list(@ActiveUser() user: AccessTokenPayload, @Query() query: ListHandoversQueryDTO) {
    return this.service.list(user.userId, query)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Get(':id')
  getById(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.getById(user.userId, id)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Post()
  create(@ActiveUser() user: AccessTokenPayload, @Body() body: CreateHandoverBodyDTO) {
    return this.service.create(user.userId, body)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Patch(':id')
  update(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateHandoverBodyDTO,
  ) {
    return this.service.update(user.userId, id, body)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Patch(':id/confirm')
  confirm(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ConfirmHandoverBodyDTO,
  ) {
    return this.service.confirmStaff(user.userId, id, body)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Patch(':id/dispute')
  dispute(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: DisputeHandoverBodyDTO,
  ) {
    return this.service.disputeStaff(user.userId, id, body)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Patch(':id/resolve')
  resolve(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ResolveHandoverBodyDTO,
  ) {
    return this.service.resolve(user.userId, id, body)
  }
}
