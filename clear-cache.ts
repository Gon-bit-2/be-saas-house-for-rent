import { PrismaClient } from './generated/prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import * as dotenv from 'dotenv'

dotenv.config()

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function clearOcrCache() {
  await prisma.ocrJob.deleteMany({})
  console.log('Cleared OCR jobs cache.')
}

clearOcrCache().finally(() => prisma.$disconnect())
