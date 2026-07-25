import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common'
import roleName from '@src/common/constants/role.constant'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { IsTenant, Roles } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import {
  CancelMyRentalRequestBodyDTO,
  DecideRentalRequestBodyDTO,
  ListRentalRequestsQueryDTO,
} from './dto/rental-requests.dto'
import { RentalRequestsService } from './rental-requests.service'

/**
 * Controller for landlord rental request handling and renter-side request tracking.
 */
@Controller('rental-requests')
export class RentalRequestsController {
  constructor(private readonly rentalRequestsService: RentalRequestsService) {}

  @IsTenant()
  @Get('me')
  listMine(@ActiveUser() user: AccessTokenPayload, @Query() query: ListRentalRequestsQueryDTO) {
    return this.rentalRequestsService.listMine(user.userId, query)
  }

  @IsTenant()
  @Patch('me/:id/cancel')
  cancelMine(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CancelMyRentalRequestBodyDTO,
  ) {
    return this.rentalRequestsService.cancelMine(user.userId, id, body)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Get()
  listForLandlord(@ActiveUser() user: AccessTokenPayload, @Query() query: ListRentalRequestsQueryDTO) {
    return this.rentalRequestsService.listForLandlord(user.userId, query)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Get(':id')
  getForLandlord(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.rentalRequestsService.getForLandlord(user.userId, id)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Patch(':id/decision')
  decide(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: DecideRentalRequestBodyDTO,
  ) {
    return this.rentalRequestsService.decide(user.userId, id, body)
  }
}
