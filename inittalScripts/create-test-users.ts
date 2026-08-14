import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { hash } from 'bcrypt'
import { Pool } from 'pg'
import { PrismaClient } from '../generated/prisma/client'
import { UserStatus } from '../generated/prisma/enums'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required')

const pool = new Pool({ connectionString: databaseUrl })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  // Đọc danh sách email từ .env, fallback về string rỗng nếu không có
  const testEmailsRaw = process.env.TEST_ACCOUNT_EMAILS || ''

  const testEmails = testEmailsRaw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  if (testEmails.length === 0) {
    console.log('Không tìm thấy TEST_ACCOUNT_EMAILS nào trong .env')
    return
  }

  const defaultPassword = 'TestPassword123!'
  const passwordHash = await hash(defaultPassword, 10)
  const fixedNow = new Date()

  console.log(`Đang tạo ${testEmails.length} test accounts...`)

  for (const email of testEmails) {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        status: UserStatus.ACTIVE,
        emailVerifiedAt: fixedNow,
        deletedAt: null,
      },
      create: {
        fullName: `Test User (${email.split('@')[0]})`,
        email,
        passwordHash,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: fixedNow,
      },
    })
    console.log(`- Đã upsert thành công: ${user.email} (Mật khẩu: ${defaultPassword})`)
  }

  console.log('Hoàn thành tạo test accounts!')
}

main()
  .catch((error: unknown) => {
    console.error('Failed to create test accounts', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
