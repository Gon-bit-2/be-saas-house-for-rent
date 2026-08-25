import { Injectable } from '@nestjs/common'
import type { User } from 'generated/prisma/client'
import { PrismaService } from '@src/shared/modules/database/prisma.service'

@Injectable()
export class TenantMembersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listMembers(tenantId: number) {
    return this.prisma.tenantMember.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  async findRoleById(roleId: string) {
    return this.prisma.role.findUnique({ where: { id: roleId } })
  }

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    })
  }

  async getMemberById(tenantId: number, memberId: number) {
    return this.prisma.tenantMember.findFirst({
      where: { id: memberId, tenantId },
    })
  }

  async updateMemberRole(memberId: number, roleId: string) {
    return this.prisma.tenantMember.update({
      where: { id: memberId },
      data: { roleId },
    })
  }

  async removeMember(memberId: number) {
    return this.prisma.tenantMember.delete({
      where: { id: memberId },
    })
  }

  async addMemberTransaction(
    tenantId: number,
    email: string,
    fullName: string,
    roleId: string,
    existingUser: User | null,
    passwordHash?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      let user = existingUser

      // Nếu user chưa tồn tại, tạo mới
      if (!user && passwordHash) {
        user = await tx.user.create({
          data: {
            email,
            fullName,
            passwordHash,
            status: 'ACTIVE',
            emailVerifiedAt: new Date(),
          },
        })
      }

      if (!user) {
        throw new Error('USER_NOT_FOUND_OR_CREATED')
      }

      // Kiểm tra xem đã là thành viên chưa
      const existingMember = await tx.tenantMember.findFirst({
        where: {
          tenantId,
          userId: user.id,
        },
      })

      if (existingMember) {
        throw new Error('MEMBER_EXISTS')
      }

      const member = await tx.tenantMember.create({
        data: {
          tenantId,
          userId: user.id,
          roleId,
          status: 'ACTIVE',
          joinedAt: new Date(),
        },
      })

      return member
    })
  }
}
