import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import { TenantAccessService } from '@src/shared/modules/services/tenant-access.service'
import type { Prisma } from 'generated/prisma/client'
import type {
  TAddContractMemberBodySchema,
  TCreateContractBodySchema,
  TListContractsQuerySchema,
  TUpdateContractBodySchema,
} from './model/contracts.model'
import { ContractsRepository } from './repositories/contracts.repo'

const EDITABLE_STATUSES = ['DRAFT', 'WAITING_LANDLORD_SIGN', 'WAITING_RENTER_SIGN'] as const

/**
 * Service for landlord contract management and renter contract lookup.
 */
@Injectable()
export class ContractsService {
  constructor(
    private readonly contractsRepository: ContractsRepository,
    private readonly tenantAccessService: TenantAccessService,
  ) {}

  async listForLandlord(userId: number, query: TListContractsQuerySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const { page, limit, skip } = normalizePagination(query)
    const where = this.buildTenantContractWhere(tenant.tenantId, query)
    const [contracts, total] = await this.contractsRepository.findMany(where, skip, limit)
    return buildPaginatedResult(contracts, total, page, limit)
  }

  async getForLandlord(userId: number, id: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    return this.getTenantContractOrThrow(tenant.tenantId, id)
  }

  async createDraft(userId: number, body: TCreateContractBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    this.assertDateRange(body.startDate, body.endDate)

    const room = await this.contractsRepository.findRoomForContract(tenant.tenantId, body.roomId)
    if (!room) {
      throw new NotFoundException('Không tìm thấy phòng trong tenant hiện tại')
    }
    if (!['AVAILABLE', 'RESERVED'].includes(room.status)) {
      throw new BadRequestException('Chỉ có thể tạo hợp đồng cho phòng trống hoặc đang giữ chỗ')
    }

    const coRenterIds = body.coRenterIds ?? []
    await this.assertRentersCanJoinContract(body.renterId, coRenterIds, room.maxOccupants)

    if (body.rentalRequestId) {
      const request = await this.contractsRepository.findApprovedRentalRequest(tenant.tenantId, body.rentalRequestId)
      if (!request) {
        throw new BadRequestException('Yêu cầu thuê không tồn tại hoặc chưa được duyệt')
      }
      if (request.roomId !== body.roomId || request.renterId !== body.renterId) {
        throw new BadRequestException('Yêu cầu thuê không khớp với phòng hoặc người thuê chính')
      }
    }

    if (body.templateId) {
      const template = await this.contractsRepository.findTenantTemplate(tenant.tenantId, body.templateId)
      if (!template) {
        throw new NotFoundException('Không tìm thấy mẫu hợp đồng trong tenant hiện tại')
      }
    }

    const contractCode = await this.resolveContractCode(tenant.tenantId, body.contractCode)

    return this.contractsRepository.create(
      {
        tenantId: tenant.tenantId,
        roomId: body.roomId,
        renterId: body.renterId,
        rentalRequestId: body.rentalRequestId ?? null,
        templateId: body.templateId ?? null,
        contractCode,
        startDate: body.startDate,
        endDate: body.endDate,
        monthlyPrice: body.monthlyPrice,
        depositAmount: body.depositAmount,
        billingCycle: body.billingCycle,
        paymentDueDay: body.paymentDueDay,
        contentSnapshot: body.contentSnapshot,
        status: 'DRAFT',
        createdById: userId,
        updatedById: userId,
      },
      coRenterIds,
      body.renterInfo,
    )
  }

  async updateDraft(userId: number, id: number, body: TUpdateContractBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const contract = await this.getTenantContractOrThrow(tenant.tenantId, id)
    if (!EDITABLE_STATUSES.includes(contract.status as (typeof EDITABLE_STATUSES)[number])) {
      throw new BadRequestException('Chỉ có thể cập nhật hợp đồng nháp hoặc đang chờ ký')
    }

    const startDate = body.startDate ?? contract.startDate
    const endDate = body.endDate ?? contract.endDate
    this.assertDateRange(startDate, endDate)

    if (body.coRenterIds) {
      await this.assertRentersCanJoinContract(contract.renterId, body.coRenterIds, contract.room.maxOccupants)
    }

    const data: Prisma.ContractUncheckedUpdateInput = {
      startDate: body.startDate,
      endDate: body.endDate,
      monthlyPrice: body.monthlyPrice,
      depositAmount: body.depositAmount,
      billingCycle: body.billingCycle,
      paymentDueDay: body.paymentDueDay,
      contentSnapshot: body.contentSnapshot,
      updatedById: userId,
    }

    return this.contractsRepository.update(id, contract.renterId, data, body.coRenterIds, body.renterInfo)
  }

  async activate(userId: number, id: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const contract = await this.getTenantContractOrThrow(tenant.tenantId, id)

    if (!EDITABLE_STATUSES.includes(contract.status as (typeof EDITABLE_STATUSES)[number])) {
      throw new BadRequestException('Chỉ có thể kích hoạt hợp đồng nháp hoặc đang chờ ký')
    }
    if (!['AVAILABLE', 'RESERVED'].includes(contract.room.status)) {
      throw new BadRequestException('Phòng không còn trống hoặc giữ chỗ để kích hoạt hợp đồng')
    }

    const activeRoomContracts = await this.contractsRepository.countActiveRoomContracts(contract.roomId, contract.id)
    if (activeRoomContracts > 0) {
      throw new ConflictException('Phòng đã có hợp đồng đang hiệu lực')
    }

    try {
      return await this.contractsRepository.activate(tenant.tenantId, id, userId)
    } catch (error) {
      if (error instanceof Error && ['CONTRACT_ACTIVATION_CONFLICT', 'CONTRACT_ROOM_CONFLICT'].includes(error.message))
        throw new ConflictException('Hợp đồng hoặc phòng đã được xử lý bởi thao tác khác')
      if (this.isPrismaError(error, ['P2002', 'P2034']))
        throw new ConflictException('Phòng đã có hợp đồng đang hiệu lực')
      throw error
    }
  }

  async expire(userId: number, id: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const contract = await this.getTenantContractOrThrow(tenant.tenantId, id)
    if (contract.status !== 'ACTIVE') {
      throw new BadRequestException('Chỉ có thể hết hạn hợp đồng đang hiệu lực')
    }
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    if (new Date(contract.endDate).getTime() > today.getTime()) {
      throw new BadRequestException('Hợp đồng chưa đến ngày hết hạn')
    }

    try {
      return await this.contractsRepository.expire(tenant.tenantId, id, userId)
    } catch (error) {
      if (
        (error instanceof Error && error.message === 'CONTRACT_EXPIRY_CONFLICT') ||
        this.isPrismaError(error, ['P2034'])
      ) {
        throw new ConflictException('Hợp đồng đã được xử lý bởi thao tác khác')
      }
      throw error
    }
  }

  async cancel(userId: number, id: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const contract = await this.getTenantContractOrThrow(tenant.tenantId, id)
    if (contract.status === 'ACTIVE') {
      throw new BadRequestException('Không thể hủy hợp đồng đang hiệu lực trong mốc này')
    }
    if (['EXPIRED', 'TERMINATED', 'CANCELED'].includes(contract.status)) {
      throw new BadRequestException('Không thể hủy hợp đồng ở trạng thái hiện tại')
    }
    return this.contractsRepository.cancel(id, userId)
  }

  async addMember(actorId: number, id: number, body: TAddContractMemberBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(actorId)
    const contract = await this.getTenantContractOrThrow(tenant.tenantId, id)
    
    if (['CANCELED', 'TERMINATED', 'EXPIRED'].includes(contract.status)) {
      throw new BadRequestException('Không thể thêm thành viên vào hợp đồng đã kết thúc hoặc bị hủy')
    }

    const currentMemberIds = contract.members.map((m) => m.userId)
    if (currentMemberIds.includes(body.userId)) {
      throw new BadRequestException('Người dùng này đã là thành viên của hợp đồng')
    }

    const newCoRenterIds = contract.members
      .filter(m => m.role === 'CO_RENTER')
      .map(m => m.userId)
    newCoRenterIds.push(body.userId)

    await this.assertRentersCanJoinContract(contract.renterId, newCoRenterIds, contract.room.maxOccupants)

    return this.contractsRepository.addMember(id, body.userId)
  }

  async removeMember(actorId: number, id: number, memberUserId: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(actorId)
    const contract = await this.getTenantContractOrThrow(tenant.tenantId, id)
    
    if (['CANCELED', 'TERMINATED', 'EXPIRED'].includes(contract.status)) {
      throw new BadRequestException('Không thể xóa thành viên khỏi hợp đồng đã kết thúc hoặc bị hủy')
    }

    if (memberUserId === contract.renterId) {
      throw new BadRequestException('Không thể xóa người thuê chính khỏi hợp đồng')
    }

    const isMember = contract.members.some((m) => m.userId === memberUserId)
    if (!isMember) {
      throw new NotFoundException('Không tìm thấy thành viên này trong hợp đồng')
    }

    return this.contractsRepository.removeMember(id, memberUserId)
  }

  async listMine(userId: number, query: TListContractsQuerySchema) {
    const { page, limit, skip } = normalizePagination(query)
    const [contracts, total] = await this.contractsRepository.findMine(userId, skip, limit)
    return buildPaginatedResult(contracts, total, page, limit)
  }

  async getMine(userId: number, id: number) {
    const contract = await this.contractsRepository.getMine(userId, id)
    if (!contract) {
      throw new NotFoundException('Không tìm thấy hợp đồng của bạn')
    }
    return contract
  }

  private async getTenantContractOrThrow(tenantId: number, id: number) {
    const contract = await this.contractsRepository.findById(tenantId, id)
    if (!contract) {
      throw new NotFoundException('Không tìm thấy hợp đồng trong tenant hiện tại')
    }
    return contract
  }

  private assertDateRange(startDate: Date, endDate: Date) {
    if (endDate.getTime() <= startDate.getTime()) {
      throw new BadRequestException('Ngày kết thúc hợp đồng phải sau ngày bắt đầu')
    }
  }

  private async assertRentersCanJoinContract(mainRenterId: number, coRenterIds: number[], maxOccupants: number) {
    if (coRenterIds.includes(mainRenterId)) {
      throw new BadRequestException('Người thuê chính không được nằm trong danh sách người ở cùng')
    }
    if (coRenterIds.length + 1 > maxOccupants) {
      throw new BadRequestException('Số người trong hợp đồng vượt quá sức chứa tối đa của phòng')
    }

    const uniqueUserIds = [mainRenterId, ...coRenterIds]
    const renters = await this.contractsRepository.findRentersWithProfiles(uniqueUserIds)
    if (renters.length !== uniqueUserIds.length) {
      throw new BadRequestException('Người thuê phải là tài khoản active và có hồ sơ người thuê')
    }
  }

  private async resolveContractCode(tenantId: number, requestedCode?: string) {
    if (requestedCode) {
      const taken = await this.contractsRepository.isContractCodeTaken(requestedCode)
      if (taken) {
        throw new ConflictException('Mã hợp đồng đã tồn tại')
      }
      return requestedCode
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = this.generateContractCode(tenantId)
      const taken = await this.contractsRepository.isContractCodeTaken(code)
      if (!taken) {
        return code
      }
    }

    throw new ConflictException('Không thể sinh mã hợp đồng duy nhất, vui lòng thử lại')
  }

  private generateContractCode(tenantId: number) {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase()
    return `HD-${tenantId}-${date}-${suffix}`
  }

  private buildTenantContractWhere(tenantId: number, query: TListContractsQuerySchema): Prisma.ContractWhereInput {
    return {
      tenantId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.roomId ? { roomId: query.roomId } : {}),
      ...(query.renterId ? { renterId: query.renterId } : {}),
      ...(query.propertyId ? { room: { propertyId: query.propertyId } } : {}),
      ...(query.search
        ? {
            OR: [
              { contractCode: { contains: query.search, mode: 'insensitive' } },
              { renter: { fullName: { contains: query.search, mode: 'insensitive' } } },
              { renter: { email: { contains: query.search, mode: 'insensitive' } } },
              { renter: { phone: { contains: query.search, mode: 'insensitive' } } },
              { room: { roomCode: { contains: query.search, mode: 'insensitive' } } },
              { room: { title: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }
  }

  private isPrismaError(error: unknown, codes: string[]) {
    if (!error || typeof error !== 'object' || !('code' in error)) return false
    return codes.includes(String(error.code))
  }
}
