import { Injectable } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import roleName from '@src/common/constants/role.constant'

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách các quyền (roles) hợp lệ để Chủ trọ/Quản lý có thể gán cho nhân viên
   * Chỉ bao gồm các quyền nhân viên (MANAGER, ACCOUNTANT, MAINTENANCE_STAFF)
   */
  async getTenantAssignableRoles() {
    return this.prisma.role.findMany({
      where: {
        id: {
          in: [roleName.MANAGER, roleName.ACCOUNTANT, roleName.MAINTENANCE_STAFF],
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: {
        name: 'asc',
      },
    })
  }
}
