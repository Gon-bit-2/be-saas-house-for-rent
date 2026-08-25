import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { hash } from 'bcrypt'
import { Pool } from 'pg'
import { PrismaClient } from '../generated/prisma/client'
import { UserStatus, TenantMemberStatus } from '../generated/prisma/enums'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required')

const pool = new Pool({ connectionString: databaseUrl })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  const landlordEmail = '2tbindia001@gmail.com'
  
  console.log(`Đang tìm chủ trọ với email: ${landlordEmail}...`)
  const landlord = await prisma.user.findUnique({
    where: { email: landlordEmail }
  })

  if (!landlord) {
    console.log(`Không tìm thấy chủ trọ với email ${landlordEmail}`)
    return
  }

  const tenant = await prisma.tenant.findFirst({
    where: { ownerUserId: landlord.id, status: 'ACTIVE', deletedAt: null }
  })

  if (!tenant) {
    console.log(`Chủ trọ ${landlordEmail} chưa tạo hệ thống nhà trọ nào hoặc đang bị vô hiệu hóa.`)
    return
  }

  console.log(`Tìm thấy nhà trọ: ${tenant.name} (Tenant ID: ${tenant.id})`)

  const testWorkers = [
    { email: 'baotri1@2tbindia.com', fullName: 'Nhân viên bảo trì 1' },
    { email: 'baotri2@2tbindia.com', fullName: 'Nhân viên bảo trì 2' }
  ]

  const defaultPassword = 'TestPassword123!'
  const passwordHash = await hash(defaultPassword, 10)
  const fixedNow = new Date()

  console.log(`Đang tạo ${testWorkers.length} nhân viên bảo trì...`)

  for (const workerInfo of testWorkers) {
    // 1. Tạo hoặc update user account
    const user = await prisma.user.upsert({
      where: { email: workerInfo.email },
      update: {
        status: UserStatus.ACTIVE,
        emailVerifiedAt: fixedNow,
        deletedAt: null,
      },
      create: {
        fullName: workerInfo.fullName,
        email: workerInfo.email,
        passwordHash,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: fixedNow,
      },
    })

    // 2. Liên kết vào tenant với quyền MAINTENANCE_STAFF
    await prisma.tenantMember.upsert({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId: user.id
        }
      },
      update: {
        roleId: 'MAINTENANCE_STAFF',
        status: TenantMemberStatus.ACTIVE,
        joinedAt: fixedNow
      },
      create: {
        tenantId: tenant.id,
        userId: user.id,
        roleId: 'MAINTENANCE_STAFF',
        status: TenantMemberStatus.ACTIVE,
        joinedAt: fixedNow
      }
    })

    console.log(`- Đã tạo thành công nhân viên bảo trì: ${user.fullName} | Email: ${user.email} | Mật khẩu: ${defaultPassword}`)
  }

  console.log('Hoàn thành!')
}

main()
  .catch((error: unknown) => {
    console.error('Lỗi khi tạo nhân viên bảo trì:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
