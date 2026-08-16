import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Delete } from '@nestjs/common'
import roleName from '@src/common/constants/role.constant'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { IsTenant, Roles } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import {
  CreateContractBodyDTO,
  ListContractsQueryDTO,
  UpdateContractBodyDTO,
  AddContractMemberBodyDTO,
  SignContractBodyDTO,
} from './dto/contracts.dto'
import { ContractsService } from './contracts.service'

/**
 * Controller for landlord contract operations and renter contract self-service.
 */
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @IsTenant()
  @Get('me')
  listMine(@ActiveUser() user: AccessTokenPayload, @Query() query: ListContractsQueryDTO) {
    return this.contractsService.listMine(user.userId, query)
  }

  @IsTenant()
  @Get('me/:id')
  getMine(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.contractsService.getMine(user.userId, id)
  }

  @IsTenant()
  @Post('me/:id/sign')
  signRenter(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SignContractBodyDTO,
  ) {
    return this.contractsService.signRenter(user.userId, id, body.signature)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Get()
  listForLandlord(@ActiveUser() user: AccessTokenPayload, @Query() query: ListContractsQueryDTO) {
    return this.contractsService.listForLandlord(user.userId, query)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Get(':id')
  getForLandlord(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.contractsService.getForLandlord(user.userId, id)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Post()
  createDraft(@ActiveUser() user: AccessTokenPayload, @Body() body: CreateContractBodyDTO) {
    return this.contractsService.createDraft(user.userId, body)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Patch(':id')
  updateDraft(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateContractBodyDTO,
  ) {
    return this.contractsService.updateDraft(user.userId, id, body)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Post(':id/sign-landlord')
  signLandlord(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SignContractBodyDTO,
  ) {
    return this.contractsService.signLandlord(user.userId, id, body.signature)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Patch(':id/activate')
  activate(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.contractsService.activate(user.userId, id)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Patch(':id/expire')
  expire(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.contractsService.expire(user.userId, id)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Patch(':id/cancel')
  cancel(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.contractsService.cancel(user.userId, id)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Post(':id/members')
  addMember(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AddContractMemberBodyDTO,
  ) {
    return this.contractsService.addMember(user.userId, id, body)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Delete(':id/members/:userId')
  removeMember(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) memberUserId: number,
  ) {
    return this.contractsService.removeMember(user.userId, id, memberUserId)
  }
}
