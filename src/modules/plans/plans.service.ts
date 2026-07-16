import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import type { Prisma } from 'generated/prisma/client'
import { PlansRepository } from './repositories/plans.repo'
import type { TCreatePlanBodySchema, TListPlansQuerySchema, TUpdatePlanBodySchema } from './model/plans.model'

/**
 * Service containing Super Admin business rules for SaaS plans.
 */
@Injectable()
export class PlansService {
  constructor(private readonly plansRepository: PlansRepository) {}

  async list(query: TListPlansQuerySchema) {
    const { page, limit, skip } = normalizePagination(query)
    const where = this.buildListWhere(query)
    const [plans, total] = await this.plansRepository.findManyAndCount(where, skip, limit)
    return buildPaginatedResult(plans, total, page, limit)
  }

  async getById(id: number) {
    const plan = await this.plansRepository.findById(id)
    if (!plan) {
      throw new NotFoundException('Không tìm thấy gói dịch vụ')
    }
    return plan
  }

  /**
   * Creates a plan after normalizing its business code and preventing duplicates.
   */
  async create(body: TCreatePlanBodySchema, actorId: number) {
    const code = this.normalizePlanCode(body.code)
    const existingPlan = await this.plansRepository.findByCode(code)
    if (existingPlan) {
      throw new ConflictException('Mã gói dịch vụ đã tồn tại')
    }

    return this.plansRepository.create({
      code,
      name: body.name,
      description: body.description ?? null,
      priceMonthly: body.priceMonthly,
      priceYearly: body.priceYearly,
      maxRooms: body.maxRooms,
      maxStaff: body.maxStaff,
      allowAiOcr: body.allowAiOcr,
      allowWebhookPayment: body.allowWebhookPayment,
      isActive: body.isActive,
      createdBy: { connect: { id: actorId } },
    })
  }

  async update(id: number, body: TUpdatePlanBodySchema, actorId: number) {
    await this.getById(id)

    return this.plansRepository.update(id, {
      ...body,
      description: body.description === undefined ? undefined : (body.description ?? null),
      updatedBy: { connect: { id: actorId } },
    })
  }

  private buildListWhere(query: TListPlansQuerySchema): Prisma.PlanWhereInput {
    return {
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }
  }

  private normalizePlanCode(code: string) {
    return code.trim().toUpperCase().replace(/\s+/g, '_')
  }
}
