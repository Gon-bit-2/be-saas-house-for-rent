import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import roleName from '@src/common/constants/role.constant'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { IsTenant, Roles } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import { ContractTerminationsService } from './contract-terminations.service'
import {
  CompleteContractTerminationBodyDTO,
  CreateContractTerminationBodyDTO,
  EmptyContractTerminationBodyDTO,
  ListContractTerminationsQueryDTO,
  ReviewContractTerminationBodyDTO,
} from './dto/contract-terminations.dto'

@Controller('contract-terminations')
export class ContractTerminationsController {
  constructor(private readonly service: ContractTerminationsService) {}

  @IsTenant()
  @Get('me')
  listMine(@ActiveUser() user: AccessTokenPayload, @Query() query: ListContractTerminationsQueryDTO) {
    return this.service.listMine(user.userId, query)
  }

  @IsTenant()
  @Get('me/:id')
  getMine(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.getMine(user.userId, id)
  }

  @IsTenant()
  @Post('me')
  createMine(@ActiveUser() user: AccessTokenPayload, @Body() body: CreateContractTerminationBodyDTO) {
    return this.service.createMine(user.userId, body)
  }

  @IsTenant()
  @Patch('me/:id/cancel')
  cancelMine(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: EmptyContractTerminationBodyDTO,
  ) {
    void body
    return this.service.cancelMine(user.userId, id)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Get()
  list(@ActiveUser() user: AccessTokenPayload, @Query() query: ListContractTerminationsQueryDTO) {
    return this.service.list(user.userId, query)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Get(':id')
  getById(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.getById(user.userId, id)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Post()
  create(@ActiveUser() user: AccessTokenPayload, @Body() body: CreateContractTerminationBodyDTO) {
    return this.service.create(user.userId, body)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Patch(':id/approve')
  approve(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ReviewContractTerminationBodyDTO,
  ) {
    return this.service.approve(user.userId, id, body)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Patch(':id/reject')
  reject(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ReviewContractTerminationBodyDTO,
  ) {
    return this.service.reject(user.userId, id, body)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Patch(':id/cancel')
  cancel(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: EmptyContractTerminationBodyDTO,
  ) {
    void body
    return this.service.cancel(user.userId, id)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Patch(':id/complete')
  complete(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CompleteContractTerminationBodyDTO,
  ) {
    return this.service.complete(user.userId, id, body)
  }
}
