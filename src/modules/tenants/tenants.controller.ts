import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { IsAdmin } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import {
  AssignTenantPlanBodyDTO,
  CreateTenantBodyDTO,
  ListTenantsQueryDTO,
  UpdateTenantBodyDTO,
  UpdateTenantStatusBodyDTO,
  UpdateTenantVerificationBodyDTO,
} from './dto/tenants.dto'
import { TenantsService } from './tenants.service'

/**
 * Super Admin controller for managing landlord tenants and plan assignments.
 */
@IsAdmin()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  list(@Query() query: ListTenantsQueryDTO) {
    return this.tenantsService.list(query)
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.getById(id)
  }

  @Post()
  createLandlordTenant(@ActiveUser() user: AccessTokenPayload, @Body() body: CreateTenantBodyDTO) {
    return this.tenantsService.createLandlordTenant(body, user.userId)
  }

  @Patch(':id')
  update(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTenantBodyDTO,
  ) {
    return this.tenantsService.update(id, body, user.userId)
  }

  @Patch(':id/status')
  updateStatus(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTenantStatusBodyDTO,
  ) {
    return this.tenantsService.updateStatus(id, body, user.userId)
  }

  @Patch(':id/verification')
  updateVerification(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTenantVerificationBodyDTO,
  ) {
    return this.tenantsService.updateVerification(id, body, user.userId)
  }

  @Patch(':id/plan')
  assignPlan(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AssignTenantPlanBodyDTO,
  ) {
    return this.tenantsService.assignPlan(id, body, user.userId)
  }
}
