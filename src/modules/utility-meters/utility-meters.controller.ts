import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import roleName from '@src/common/constants/role.constant'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { Roles } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import {
  CreateUtilityMeterBodyDTO,
  ListUtilityMetersQueryDTO,
  UpdateUtilityMeterBodyDTO,
  UpdateUtilityMeterStatusBodyDTO,
} from './dto/utility-meters.dto'
import { UtilityMetersService } from './utility-meters.service'

/**
 * Controller for configuring room electricity and water meters.
 */
@Roles(roleName.LANDLORD, roleName.MANAGER)
@Controller('utility-meters')
export class UtilityMetersController {
  constructor(private readonly utilityMetersService: UtilityMetersService) {}

  @Get()
  list(@ActiveUser() user: AccessTokenPayload, @Query() query: ListUtilityMetersQueryDTO) {
    return this.utilityMetersService.list(user.userId, query)
  }

  @Get(':id')
  getById(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.utilityMetersService.getById(user.userId, id)
  }

  @Post()
  create(@ActiveUser() user: AccessTokenPayload, @Body() body: CreateUtilityMeterBodyDTO) {
    return this.utilityMetersService.create(user.userId, body)
  }

  @Patch(':id')
  update(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUtilityMeterBodyDTO,
  ) {
    return this.utilityMetersService.update(user.userId, id, body)
  }

  @Patch(':id/status')
  updateStatus(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUtilityMeterStatusBodyDTO,
  ) {
    return this.utilityMetersService.updateStatus(user.userId, id, body)
  }
}
