import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { IsAdmin } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import { ListLandlordsQueryDTO, UpdateUserStatusBodyDTO } from './dto/users.dto'
import { UsersService } from './users.service'

/**
 * Super Admin controller for user and landlord account administration.
 */
@IsAdmin()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('landlords')
  listLandlords(@Query() query: ListLandlordsQueryDTO) {
    return this.usersService.listLandlords(query)
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getById(id)
  }

  @Patch(':id/status')
  updateStatus(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUserStatusBodyDTO,
  ) {
    return this.usersService.updateStatus(user.userId, id, body)
  }
}
