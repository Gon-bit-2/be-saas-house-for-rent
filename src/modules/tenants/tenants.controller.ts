import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { IsAdmin, IsTenant } from '@src/common/decorators/decorators/roles.decorator'
import { SkipPermission } from '@src/common/decorators/decorators/skip-permission.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import {
  AssignTenantPlanBodyDTO,
  CreateTenantBodyDTO,
  ListTenantsQueryDTO,
  UpdateTenantBodyDTO,
  UpdateTenantStatusBodyDTO,
  UpdateTenantVerificationBodyDTO,
  UpdateMyVerificationBodyDTO,
  RegisterTenantBodyDTO,
} from './dto/tenants.dto'
import { TenantsService } from './tenants.service'

/**
 * Controller for managing tenants.
 * Admin endpoints are protected with @IsAdmin().
 */
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @IsAdmin()
  @Get()
  list(@Query() query: ListTenantsQueryDTO) {
    return this.tenantsService.list(query)
  }

  @IsAdmin()
  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.getById(id)
  }

  @IsAdmin()
  @Post()
  createLandlordTenant(@ActiveUser() user: AccessTokenPayload, @Body() body: CreateTenantBodyDTO) {
    return this.tenantsService.createLandlordTenant(body, user.userId)
  }

  @SkipPermission()
  @Post('register')
  register(@ActiveUser() user: AccessTokenPayload, @Body() body: RegisterTenantBodyDTO) {
    return this.tenantsService.registerMyTenant(user.userId, body)
  }

  @IsAdmin()
  @Patch(':id')
  update(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTenantBodyDTO,
  ) {
    return this.tenantsService.update(id, body, user.userId)
  }

  @IsTenant()
  @Patch('me/verification')
  updateMyVerification(@ActiveUser() user: AccessTokenPayload, @Body() body: UpdateMyVerificationBodyDTO) {
    return this.tenantsService.updateMyVerification(user.userId, body)
  }

  @IsAdmin()
  @Patch(':id/status')
  updateStatus(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTenantStatusBodyDTO,
  ) {
    return this.tenantsService.updateStatus(id, body, user.userId)
  }

  @IsAdmin()
  @Patch(':id/verification')
  updateVerification(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTenantVerificationBodyDTO,
  ) {
    return this.tenantsService.updateVerification(id, body, user.userId)
  }

  @IsAdmin()
  @Patch(':id/plan')
  assignPlan(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AssignTenantPlanBodyDTO,
  ) {
    return this.tenantsService.assignPlan(id, body, user.userId)
  }
}
