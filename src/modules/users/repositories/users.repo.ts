import { Injectable } from '@nestjs/common'
import roleName from '@src/common/constants/role.constant'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import type { Prisma } from 'generated/prisma/client'

export const adminUserSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  systemRole: true,
  avatarUrl: true,
  status: true,
  emailVerifiedAt: true,
  phoneVerifiedAt: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  ownedTenants: {
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      verificationStatus: true,
    },
  },
  tenantMembers: {
    where: { roleId: roleName.LANDLORD },
    select: {
      id: true,
      tenantId: true,
      roleId: true,
      status: true,
      joinedAt: true,
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          verificationStatus: true,
        },
      },
    },
  },
} satisfies Prisma.UserSelect

/**
 * Repository for Super Admin user management queries.
 */
@Injectable()
export class UsersRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(where: Prisma.UserWhereInput, skip: number, take: number) {
    return this.prismaService.$transaction([
      this.prismaService.user.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }],
        select: adminUserSelect,
      }),
      this.prismaService.user.count({ where }),
    ])
  }

  async findById(id: number) {
    return this.prismaService.user.findFirst({
      where: {
        id,
        deletedAt: null,
        tenantMembers: { some: { roleId: roleName.LANDLORD } },
      },
      select: adminUserSelect,
    })
  }

  async update(
    id: number,
    oldStatus: 'ACTIVE' | 'INACTIVE' | 'BANNED',
    status: 'ACTIVE' | 'INACTIVE' | 'BANNED',
    actorId: number,
    reason: string,
  ) {
    return this.prismaService.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { status },
        select: adminUserSelect,
      })

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'UPDATE_LANDLORD_STATUS',
          entityType: 'USER',
          entityId: String(id),
          oldValues: { status: oldStatus },
          newValues: { status, reason },
        },
      })

      if (status !== 'ACTIVE') {
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date(), revokedReason: reason },
        })
      }

      return updated
    })
  }
}
