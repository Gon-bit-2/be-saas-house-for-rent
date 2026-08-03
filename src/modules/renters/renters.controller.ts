import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common'
import { Post } from '@nestjs/common'
import { AuthType } from '@src/common/constants/auth.constant'
import { Auth } from '@src/common/decorators/decorators/auth.decorator'
import { AcceptRenterInvitationBodyDTO, InviteRenterBodyDTO, UpdateRenterForLandlordBodyDTO } from './dto/renters.dto'
import roleName from '@src/common/constants/role.constant'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { IsTenant, Roles } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import { ListRentalHistoryQueryDTO, ListRentersQueryDTO, UpdateRenterProfileBodyDTO } from './dto/renters.dto'
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

  @IsTenant()
  @Get('me/history')
  listMyHistory(@ActiveUser() user: AccessTokenPayload, @Query() query: ListRentalHistoryQueryDTO) {
    return this.rentersService.listMyHistory(user.userId, query)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Get()
  listForLandlord(@ActiveUser() user: AccessTokenPayload, @Query() query: ListRentersQueryDTO) {
    return this.rentersService.listForLandlord(user.userId, query)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Post('invitations')
  invite(@ActiveUser() user: AccessTokenPayload, @Body() body: InviteRenterBodyDTO) {
    return this.rentersService.invite(user.userId, body)
  }

  @Auth(AuthType.None)
  @Post('invitations/accept')
  acceptInvitation(@Body() body: AcceptRenterInvitationBodyDTO) {
    return this.rentersService.acceptInvitation(body)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Patch(':id')
  updateForLandlord(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateRenterForLandlordBodyDTO,
  ) {
    return this.rentersService.updateForLandlord(user.userId, id, body)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Get(':id/history')
  listHistory(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ListRentalHistoryQueryDTO,
  ) {
    return this.rentersService.listHistory(user.userId, id, query)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Get(':id')
  getForLandlord(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.rentersService.getForLandlord(user.userId, id)
  }
}
