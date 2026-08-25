import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { TenantMembersService } from './tenant-members.service';
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator';
import { IsTenant } from '@src/common/decorators/decorators/roles.decorator';
import type { AccessTokenPayload } from '@src/common/types/jwt.type';
import { AddTenantMemberBodyDTO, UpdateTenantMemberRoleBodyDTO } from './dto/tenant-members.dto';

@Controller('tenants/:tenantId/members')
export class TenantMembersController {
  constructor(private readonly tenantMembersService: TenantMembersService) {}

  @IsTenant()
  @Get()
  list(@Param('tenantId', ParseIntPipe) tenantId: number) {
    return this.tenantMembersService.list(tenantId);
  }

  @IsTenant()
  @Post()
  addMember(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Body() body: AddTenantMemberBodyDTO,
  ) {
    return this.tenantMembersService.addMember(tenantId, body);
  }

  @IsTenant()
  @Patch(':id/role')
  updateRole(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTenantMemberRoleBodyDTO,
  ) {
    return this.tenantMembersService.updateRole(tenantId, id, body);
  }

  @IsTenant()
  @Delete(':id')
  removeMember(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantMembersService.removeMember(tenantId, id);
  }
}
