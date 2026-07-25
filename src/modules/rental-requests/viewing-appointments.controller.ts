import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common'
import roleName from '@src/common/constants/role.constant'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { IsTenant, Roles } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import {
  CancelMyViewingAppointmentBodyDTO,
  ListViewingAppointmentsQueryDTO,
  UpdateViewingAppointmentStatusBodyDTO,
} from './dto/rental-requests.dto'
import { ViewingAppointmentsService } from './viewing-appointments.service'

/**
 * Controller for viewing appointment management on both landlord and renter sides.
 */
@Controller('room-viewing-appointments')
export class ViewingAppointmentsController {
  constructor(private readonly viewingAppointmentsService: ViewingAppointmentsService) {}

  @IsTenant()
  @Get('me')
  listMine(@ActiveUser() user: AccessTokenPayload, @Query() query: ListViewingAppointmentsQueryDTO) {
    return this.viewingAppointmentsService.listMine(user.userId, query)
  }

  @IsTenant()
  @Patch('me/:id/cancel')
  cancelMine(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CancelMyViewingAppointmentBodyDTO,
  ) {
    return this.viewingAppointmentsService.cancelMine(user.userId, id, body)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Get()
  listForLandlord(@ActiveUser() user: AccessTokenPayload, @Query() query: ListViewingAppointmentsQueryDTO) {
    return this.viewingAppointmentsService.listForLandlord(user.userId, query)
  }

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Patch(':id/status')
  updateStatus(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateViewingAppointmentStatusBodyDTO,
  ) {
    return this.viewingAppointmentsService.updateStatus(user.userId, id, body)
  }
}
