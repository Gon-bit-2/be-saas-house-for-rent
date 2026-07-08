import { Injectable } from '@nestjs/common'
import roleName from '@src/common/constants/role.constant'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import type { Prisma } from 'generated/prisma/client'
import type {
  TRefreshTokenSchema,
  TRegisterBodySchema,
  TUpdateProfileBodySchema,
  TVerificationCodeSchema,
} from '../model/auth.model'

const authUserSelect = {
  id: true,
  email: true,
  fullName: true,
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
  tenantMembers: {
    where: {
      status: 'ACTIVE',
    },
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
          ownerUserId: true,
        },
      },
      role: {
        select: {
          id: true,
          name: true,
          description: true,
          permissions: {
            select: {
              permission: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  module: true,
                  description: true,
                },
              },
            },
          },
        },
      },
    },
  },
  renterProfile: {
    select: {
      id: true,
      verificationStatus: true,
    },
  },
} satisfies Prisma.UserSelect

const authCredentialUserSelect = {
  ...authUserSelect,
  passwordHash: true,
  totpSecret: true,
} satisfies Prisma.UserSelect

const refreshTokenSelect = {
  id: true,
  userId: true,
  tokenHash: true,
  userAgent: true,
  ip: true,
  expiresAt: true,
  revokedAt: true,
  revokedReason: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.RefreshTokenSelect

const verificationCodeSelect = {
  id: true,
  email: true,
  codeHash: true,
  type: true,
  attempts: true,
  expiresAt: true,
  consumedAt: true,
  invalidatedAt: true,
  createdAt: true,
} satisfies Prisma.VerificationCodeSelect

@Injectable()
export class AuthRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async create(data: TRegisterBodySchema) {
    return await this.prismaService.$transaction(async (tx) => {
      await tx.role.findUniqueOrThrow({
        where: {
          id: data.roleCode,
        },
        select: {
          id: true,
        },
      })

      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash: data.passwordHash,
          fullName: data.fullName,
          phone: data.phone ?? null,
        },
        select: authUserSelect,
      })

      if (data.roleCode === roleName.LANDLORD) {
        const tenant = await tx.tenant.create({
          data: {
            name: `He thong cua ${user.fullName}`,
            slug: `tenant-${user.id}`,
            ownerUserId: user.id,
            email: user.email,
            phone: user.phone,
          },
        })

        await tx.tenantMember.create({
          data: {
            userId: user.id,
            tenantId: tenant.id,
            roleId: data.roleCode,
            status: 'ACTIVE',
            joinedAt: new Date(),
          },
        })
      }

      if (data.roleCode === roleName.TENANT) {
        await tx.renterProfile.create({
          data: {
            userId: user.id,
          },
        })
      }

      return tx.user.findUniqueOrThrow({
        where: {
          id: user.id,
        },
        select: authUserSelect,
      })
    })
  }

  async createOAuthTenantUser(data: {
    email: string
    fullName: string
    avatarUrl?: string
    passwordHash: string
    emailVerifiedAt: Date
  }) {
    return await this.prismaService.$transaction(async (tx) => {
      await tx.role.findUniqueOrThrow({
        where: {
          id: roleName.TENANT,
        },
        select: {
          id: true,
        },
      })

      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash: data.passwordHash,
          fullName: data.fullName,
          avatarUrl: data.avatarUrl ?? null,
          emailVerifiedAt: data.emailVerifiedAt,
        },
        select: authUserSelect,
      })

      await tx.renterProfile.create({
        data: {
          userId: user.id,
        },
      })

      return tx.user.findUniqueOrThrow({
        where: {
          id: user.id,
        },
        select: authUserSelect,
      })
    })
  }

  async findById(userId: number) {
    return await this.prismaService.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: authUserSelect,
    })
  }

  async findByEmail(email: string) {
    return await this.prismaService.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
      select: authUserSelect,
    })
  }

  async findByPhone(phone: string) {
    return await this.prismaService.user.findFirst({
      where: {
        phone,
        deletedAt: null,
      },
      select: authUserSelect,
    })
  }

  async findByEmailForCredentials(email: string) {
    return await this.prismaService.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
      select: authCredentialUserSelect,
    })
  }

  async findRoleById(roleId: string) {
    return await this.prismaService.role.findUnique({
      where: {
        id: roleId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        permissions: {
          select: {
            permission: {
              select: {
                id: true,
                code: true,
                name: true,
                module: true,
                description: true,
              },
            },
          },
        },
      },
    })
  }

  async updatePassword(userId: number, passwordHash: string) {
    return await this.prismaService.user.update({
      where: {
        id: userId,
      },
      data: {
        passwordHash,
      },
      select: authUserSelect,
    })
  }

  async updateProfile(userId: number, data: TUpdateProfileBodySchema) {
    return await this.prismaService.user.update({
      where: {
        id: userId,
      },
      data,
      select: authUserSelect,
    })
  }

  async markEmailVerified(userId: number, verifiedAt = new Date()) {
    return await this.prismaService.user.update({
      where: {
        id: userId,
      },
      data: {
        emailVerifiedAt: verifiedAt,
      },
      select: authUserSelect,
    })
  }

  async markPhoneVerified(userId: number, verifiedAt = new Date()) {
    return await this.prismaService.user.update({
      where: {
        id: userId,
      },
      data: {
        phoneVerifiedAt: verifiedAt,
      },
      select: authUserSelect,
    })
  }

  async updateLastLoginAt(userId: number, loggedInAt = new Date()) {
    return await this.prismaService.user.update({
      where: {
        id: userId,
      },
      data: {
        lastLoginAt: loggedInAt,
      },
      select: authUserSelect,
    })
  }

  async softDelete(userId: number, deletedAt = new Date()) {
    return await this.prismaService.user.update({
      where: {
        id: userId,
      },
      data: {
        deletedAt,
      },
      select: authUserSelect,
    })
  }

  async createRefreshToken(data: Pick<TRefreshTokenSchema, 'userId' | 'tokenHash' | 'expiresAt' | 'userAgent' | 'ip'>) {
    return await this.prismaService.refreshToken.create({
      data,
      select: refreshTokenSelect,
    })
  }

  async findValidRefreshTokenByHash(tokenHash: string, now = new Date()) {
    return await this.prismaService.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: {
          gt: now,
        },
        user: {
          deletedAt: null,
        },
      },
      select: {
        ...refreshTokenSelect,
        user: {
          select: authUserSelect,
        },
      },
    })
  }

  async revokeRefreshTokenByHash(tokenHash: string, revokedReason?: string, revokedAt = new Date()) {
    return await this.prismaService.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt,
        revokedReason: revokedReason ?? null,
      },
    })
  }

  async revokeAllRefreshTokensByUser(userId: number, revokedReason?: string, revokedAt = new Date()) {
    return await this.prismaService.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt,
        revokedReason: revokedReason ?? null,
      },
    })
  }

  async deleteExpiredRefreshTokens(now = new Date()) {
    return await this.prismaService.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    })
  }

  async createVerificationCode(data: Pick<TVerificationCodeSchema, 'email' | 'codeHash' | 'type' | 'expiresAt'>) {
    const issuedAt = new Date()

    return await this.prismaService.$transaction(async (tx) => {
      await tx.verificationCode.updateMany({
        where: {
          email: data.email,
          type: data.type,
          consumedAt: null,
          invalidatedAt: null,
          expiresAt: {
            gt: issuedAt,
          },
        },
        data: {
          invalidatedAt: issuedAt,
        },
      })

      return tx.verificationCode.create({
        data,
        select: verificationCodeSelect,
      })
    })
  }

  async findLatestValidVerificationCode(email: string, type: TVerificationCodeSchema['type'], now = new Date()) {
    return await this.prismaService.verificationCode.findFirst({
      where: {
        email,
        type,
        consumedAt: null,
        invalidatedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: verificationCodeSelect,
    })
  }

  async incrementVerificationAttempts(id: number) {
    return await this.prismaService.verificationCode.update({
      where: {
        id,
      },
      data: {
        attempts: {
          increment: 1,
        },
      },
      select: verificationCodeSelect,
    })
  }

  async consumeVerificationCode(id: number, consumedAt = new Date()) {
    return await this.prismaService.verificationCode.update({
      where: {
        id,
      },
      data: {
        consumedAt,
      },
      select: verificationCodeSelect,
    })
  }

  async deleteExpiredVerificationCodes(now = new Date()) {
    return await this.prismaService.verificationCode.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    })
  }
}
