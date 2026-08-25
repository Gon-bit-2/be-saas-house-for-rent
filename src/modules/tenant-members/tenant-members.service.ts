import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { HashingService } from '@src/shared/modules/services/hashing.service'
import { EmailService } from '@src/shared/modules/services/email.service'
import { AddTenantMemberBodyDTO, UpdateTenantMemberRoleBodyDTO } from './dto/tenant-members.dto'
import { TenantMembersRepository } from './repo/tenant-members.repo'
import * as crypto from 'crypto'

@Injectable()
export class TenantMembersService {
  constructor(
    private readonly repo: TenantMembersRepository,
    private readonly hashingService: HashingService,
    private readonly emailService: EmailService,
  ) {}

  async list(tenantId: number) {
    return this.repo.listMembers(tenantId)
  }

  async addMember(tenantId: number, body: AddTenantMemberBodyDTO) {
    // Kiểm tra role hợp lệ
    const role = await this.repo.findRoleById(body.roleId)
    if (!role || ['SUPER_ADMIN', 'LANDLORD', 'RENTER'].includes(role.id)) {
      throw new BadRequestException('Vai trò không hợp lệ')
    }

    const user = await this.repo.findUserByEmail(body.email)
    let generatedPassword: string | null = null
    let passwordHash: string | undefined = undefined

    if (!user) {
      generatedPassword = crypto.randomBytes(8).toString('hex')
      passwordHash = await this.hashingService.hash(generatedPassword)
    }

    try {
      await this.repo.addMemberTransaction(tenantId, body.email, body.fullName, body.roleId, user, passwordHash)
    } catch (error) {
      if (error instanceof Error && error.message === 'MEMBER_EXISTS') {
        throw new BadRequestException('Nhân viên này đã có trong tổ chức')
      }
      throw error
    }

    if (generatedPassword) {
      await this.emailService
        .sendNewAccountEmail({
          email: body.email,
          fullName: body.fullName,
          plainPassword: generatedPassword,
          loginUrl: 'https://gonshoe.online/login', // NOTE: Nên đổi thành biến môi trường FRONTEND_URL
        })
        .catch((err) => {
          console.error('Failed to send new account email:', err)
        })
    }

    return { message: 'Đã thêm nhân viên thành công' }
  }

  async updateRole(tenantId: number, memberId: number, body: UpdateTenantMemberRoleBodyDTO) {
    const member = await this.repo.getMemberById(tenantId, memberId)

    if (!member) {
      throw new NotFoundException('Không tìm thấy nhân viên')
    }

    const role = await this.repo.findRoleById(body.roleId)
    if (!role || ['SUPER_ADMIN', 'LANDLORD', 'RENTER'].includes(role.id)) {
      throw new BadRequestException('Vai trò không hợp lệ')
    }

    return this.repo.updateMemberRole(memberId, body.roleId)
  }

  async removeMember(tenantId: number, memberId: number) {
    const member = await this.repo.getMemberById(tenantId, memberId)

    if (!member) {
      throw new NotFoundException('Không tìm thấy nhân viên')
    }

    await this.repo.removeMember(memberId)

    return { message: 'Đã xóa nhân viên thành công' }
  }
}
