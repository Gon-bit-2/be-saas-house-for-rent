import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import roleName from '@src/common/constants/role.constant'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { Roles } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import {
  CreateMeterReadingBodyDTO,
  ListMeterReadingsQueryDTO,
  UpdateMeterReadingBodyDTO,
  UpdateMeterReadingStatusBodyDTO,
} from './dto/utility-meters.dto'
import { MeterReadingsService } from './meter-readings.service'

/**
 * Controller for manual electricity and water meter readings.
 */
@Roles(roleName.LANDLORD, roleName.MANAGER, roleName.ACCOUNTANT)
@Controller('meter-readings')
export class MeterReadingsController {
  constructor(private readonly meterReadingsService: MeterReadingsService) {}

  @Get()
  list(@ActiveUser() user: AccessTokenPayload, @Query() query: ListMeterReadingsQueryDTO) {
    return this.meterReadingsService.list(user.userId, query)
  }

  @Get(':id')
  getById(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.meterReadingsService.getById(user.userId, id)
  }

  @Post()
  create(@ActiveUser() user: AccessTokenPayload, @Body() body: CreateMeterReadingBodyDTO) {
    return this.meterReadingsService.create(user.userId, body)
  }

  @Patch(':id')
  update(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateMeterReadingBodyDTO,
  ) {
    return this.meterReadingsService.update(user.userId, id, body)
  }

  @Patch(':id/status')
  updateStatus(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateMeterReadingStatusBodyDTO,
  ) {
    return this.meterReadingsService.updateStatus(user.userId, id, body)
  }
}
