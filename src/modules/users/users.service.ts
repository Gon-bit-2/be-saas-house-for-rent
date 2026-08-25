import { Injectable, NotFoundException } from '@nestjs/common'
import roleName from '@src/common/constants/role.constant'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import type { Prisma } from 'generated/prisma/client'
import type {
  TListLandlordsQuerySchema,
  TListRentersQuerySchema,
  TUpdateUserStatusBodySchema,
} from './model/users.model'
import { UsersRepository } from './repositories/users.repo'

/**
 * Service containing Super Admin business rules for platform users.
 */
@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async listLandlords(query: TListLandlordsQuerySchema) {
    const { page, limit, skip } = normalizePagination(query)
    const where = this.buildLandlordWhere(query)
    const [users, total] = await this.usersRepository.findMany(where, skip, limit)
    return buildPaginatedResult(users, total, page, limit)
  }

  async getLandlordStats() {
    return this.usersRepository.getLandlordStats()
  }

  async getById(id: number) {
    const user = await this.usersRepository.findById(id)
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng')
    }
    return user
  }

  async listRenters(query: TListRentersQuerySchema) {
    const { page, limit, skip } = normalizePagination(query)
    const where = this.buildRenterWhere(query)
    const [users, total] = await this.usersRepository.findManyRenters(where, skip, limit)
    return buildPaginatedResult(users, total, page, limit)
  }

  async getRenterById(id: number) {
    const user = await this.usersRepository.findRenterById(id)
    if (!user) {
      throw new NotFoundException('Không tìm thấy người thuê')
    }
    return user
  }

  async updateStatus(actorId: number, id: number, body: TUpdateUserStatusBodySchema) {
    const landlord = await this.getById(id)
    if (landlord.status === body.status) {
      return landlord
    }
    return this.usersRepository.update(id, landlord.status, body.status, actorId, body.reason)
  }

  private buildLandlordWhere(query: TListLandlordsQuerySchema): Prisma.UserWhereInput {
    return {
      deletedAt: null,
      tenantMembers: {
        some: {
          roleId: roleName.LANDLORD,
        },
      },
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
              { ownedTenants: { some: { name: { contains: query.search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    }
  }

  private buildRenterWhere(query: TListRentersQuerySchema): Prisma.UserWhereInput {
    return {
      deletedAt: null,
      tenantMembers: {
        some: {
          roleId: roleName.TENANT,
        },
      },
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }
  }
}
