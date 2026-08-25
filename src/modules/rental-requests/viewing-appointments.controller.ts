import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common'
import roleName from '@src/common/constants/role.constant'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { IsTenant, Roles } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import {
  AssignAppointmentBodyDTO,
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
  @Get('me/:id')
  getMine(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.viewingAppointmentsService.getMine(user.userId, id)
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
  @Get(':id')
  getForLandlord(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.viewingAppointmentsService.getForLandlord(user.userId, id)
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

  @Roles(roleName.LANDLORD, roleName.MANAGER)
  @Patch(':id/assign')
  assignStaff(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AssignAppointmentBodyDTO,
  ) {
    return this.viewingAppointmentsService.assignStaff(user.userId, id, body)
  }
}
