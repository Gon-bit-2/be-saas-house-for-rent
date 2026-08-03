import { Injectable } from '@nestjs/common'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import type { Prisma } from 'generated/prisma/client'

export const planSelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  priceMonthly: true,
  priceYearly: true,
  maxRooms: true,
  maxStaff: true,
  allowAiOcr: true,
  allowWebhookPayment: true,
  isActive: true,
  createdAt: true,
  createdById: true,
  updatedById: true,
} satisfies Prisma.PlanSelect

/**
 * Repository encapsulating all Prisma access for SaaS plan management.
 */
@Injectable()
export class PlansRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findManyAndCount(where: Prisma.PlanWhereInput, skip: number, take: number) {
    return this.prismaService.$transaction([
      this.prismaService.plan.findMany({
        where,
        skip,
        take,
        orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
        select: planSelect,
      }),
      this.prismaService.plan.count({ where }),
    ])
  }

  async findById(id: number) {
    return this.prismaService.plan.findUnique({
      where: { id },
      select: planSelect,
    })
  }

  async findAvailable() {
    return this.prismaService.plan.findMany({
      where: { isActive: true },
      orderBy: [{ priceMonthly: 'asc' }, { id: 'asc' }],
      select: planSelect,
    })
  }

  async findByCode(code: string) {
    return this.prismaService.plan.findUnique({
      where: { code },
      select: planSelect,
    })
  }

  async create(data: Prisma.PlanCreateInput) {
    return this.prismaService.plan.create({
      data,
      select: planSelect,
    })
  }

  async update(id: number, data: Prisma.PlanUpdateInput) {
    return this.prismaService.plan.update({
      where: { id },
      data,
      select: planSelect,
    })
  }
}
