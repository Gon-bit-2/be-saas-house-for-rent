import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { IsAdmin } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import { ListAdminReportsQueryDTO, UpdateReportStatusBodyDTO } from './dto/reports.dto'
import { ReportsService } from './reports.service'

@IsAdmin()
@Controller('reports/admin')
export class ReportsAdminController {
  constructor(private readonly service: ReportsService) {}

  @Get()
  list(@Query() query: ListAdminReportsQueryDTO) {
    return this.service.list(query)
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id)
  }

  @Patch(':id/status')
  updateStatus(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateReportStatusBodyDTO,
  ) {
    return this.service.updateStatus(user.userId, id, body)
  }
}
