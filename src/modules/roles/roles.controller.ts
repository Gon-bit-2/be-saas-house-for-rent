import { Controller, Get } from '@nestjs/common';
import { RolesService } from './roles.service';
import { IsTenant } from '@src/common/decorators/decorators/roles.decorator';

/**
 * Controller xử lý các endpoint liên quan đến Roles.
 */
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * Lấy danh sách các quyền (roles) hợp lệ để Chủ trọ/Quản lý gán cho nhân viên
   * Yêu cầu người gọi phải thuộc một Tenant (chủ trọ hoặc quản lý)
   *
   * GET /roles/tenant-assignable
   */
  @IsTenant()
  @Get('tenant-assignable')
  getTenantAssignableRoles() {
    return this.rolesService.getTenantAssignableRoles();
  }
}
