import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common'
import roleName from '@src/common/constants/role.constant'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { IsTenant, Roles } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import { ListRentersQueryDTO, UpdateRenterProfileBodyDTO } from './dto/renters.dto'
import { RentersService } from './renters.service'

/**
 * Controller for renter self-service profile and landlord renter lookup.
 */
@Controller('renters')
export class RentersController {
  constructor(private readonly rentersService: RentersService) {}

  @IsTenant()
  @Get('me')
  getMe(@ActiveUser() user: AccessTokenPayload) {
    return this.rentersService.getMe(user.userId)
  }

  @IsTenant()
  @Patch('me')
  updateMe(@ActiveUser() user: AccessTokenPayload, @Body() body: UpdateRenterProfileBodyDTO) {
    return this.rentersService.updateMe(user.userId, body)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Get()
  listForLandlord(@ActiveUser() user: AccessTokenPayload, @Query() query: ListRentersQueryDTO) {
    return this.rentersService.listForLandlord(user.userId, query)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Get(':id')
  getForLandlord(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.rentersService.getForLandlord(user.userId, id)
  }
}
