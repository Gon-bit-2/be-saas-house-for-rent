import envConfig from '@src/config/env.config'
import * as fs from 'fs'
import { PrismaClient } from 'generated/prisma/client'
import * as path from 'path'

const prisma = new PrismaClient({ accelerateUrl: envConfig.DATABASE_URL })

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, 'add_contract_members_fields.sql'), 'utf-8')
  await prisma.$executeRawUnsafe(sql)
  console.log('Migration executed successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
