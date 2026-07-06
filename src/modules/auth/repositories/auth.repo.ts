import { Injectable } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import { TRegisterBodySchema, UserType } from '../model/auth.model'

@Injectable()
export class AuthRepo {
  constructor(private readonly prismaService: PrismaService) {}
  async create(data: TRegisterBodySchema) {
    // 1. Dùng Prisma Transaction để đảm bảo tính toàn vẹn dữ liệu
    // (Nếu tạo User thành công nhưng tạo Tenant lỗi thì toàn bộ sẽ rollback)
    return await this.prismaService.$transaction(async (tx) => {
      // 2. Tạo User account cơ bản
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash: data.passwordHash,
          fullName: data.fullName,
          phone: data.phone,
          // Không map systemRole ở đây để bảo mật (như đã phân tích)
        },
      })

      // 3. Xử lý logic chia nhánh theo Role (Chủ trọ hoặc Khách thuê)
      if (data.roleCode === 'LANDLORD') {
        // Nếu là Chủ trọ -> Bắt buộc phải có một Tổ chức (Tenant) để làm việc
        // Tạo một Tenant mặc định cho chủ trọ mới
        const tenant = await tx.tenant.create({
          data: {
            name: `Hệ thống của ${user.fullName}`,
            slug: `tenant-${user.id}`, // Đảm bảo unique bằng cách dùng UUID của user
            ownerUserId: user.id,
          },
        })

        // Phân quyền LANDLORD cho User này trong Tổ chức vừa tạo
        await tx.tenantMember.create({
          data: {
            userId: user.id,
            tenantId: tenant.id,
            roleId: data.roleCode, // Gán id là LANDLORD (vì ở Schema ta đã đổi Role ID thành mã)
            status: 'ACTIVE',
          },
        })
      } else if (data.roleCode === 'TENANT') {
        // Nếu là Khách thuê -> Tạo hồ sơ khách thuê (RenterProfile)
        // Khách thuê chưa cần có TenantMember ngay lúc đăng ký.
        // Chỉ khi nào họ Ký hợp đồng thuê với 1 Chủ trọ nào đó thì mới được Add vào TenantMember của Chủ trọ đó.
        await tx.renterProfile.create({
          data: {
            userId: user.id,
          },
        })
      }

      return user
    })
  }
}
