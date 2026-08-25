import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common'
import { TenantMembersService } from './tenant-members.service'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { IsTenant } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import { AddTenantMemberBodyDTO, UpdateTenantMemberRoleBodyDTO } from './dto/tenant-members.dto'

@Controller('tenant-members')
export class TenantMembersController {
  constructor(private readonly tenantMembersService: TenantMembersService) {}

  @IsTenant()
  @Get()
  list(@ActiveUser() user: AccessTokenPayload) {
    return this.tenantMembersService.list(user.tenantId!)
  }

  @IsTenant()
  @Post()
  addMember(@ActiveUser() user: AccessTokenPayload, @Body() body: AddTenantMemberBodyDTO) {
    return this.tenantMembersService.addMember(user.tenantId!, body)
  }

  @IsTenant()
  @Patch(':id/role')
  updateRole(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTenantMemberRoleBodyDTO,
  ) {
    return this.tenantMembersService.updateRole(user.tenantId!, id, body)
  }

  @IsTenant()
  @Delete(':id')
  removeMember(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.tenantMembersService.removeMember(user.tenantId!, id)
  }
}
