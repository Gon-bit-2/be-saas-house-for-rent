import 'dotenv/config';
import { PrismaClient } from './generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedMissingPlans() {
  await prisma.plan.upsert({
    where: { code: 'STARTER' },
    update: {
      name: 'Starter (Cơ bản)',
      description: 'Dành cho cá nhân với số lượng phòng vừa và nhỏ',
      priceMonthly: 0,
      priceYearly: 0,
      maxRooms: 30,
      maxStaff: 1,
      allowAiOcr: false,
      allowWebhookPayment: false,
      isActive: true,
    },
    create: {
      code: 'STARTER',
      name: 'Starter (Cơ bản)',
      description: 'Dành cho cá nhân với số lượng phòng vừa và nhỏ',
      priceMonthly: 0,
      priceYearly: 0,
      maxRooms: 30,
      maxStaff: 1,
      allowAiOcr: false,
      allowWebhookPayment: false,
      isActive: true,
    },
  });

  await prisma.plan.upsert({
    where: { code: 'ENTERPRISE' },
    update: {
      name: 'Enterprise',
      description: 'Dành cho chuỗi hệ thống lớn, cần tuỳ biến cao',
      priceMonthly: 0, // 0 to trigger "Tùy chỉnh" based on maxRooms
      priceYearly: 0,
      maxRooms: 999999, // Unbounded
      maxStaff: 999999,
      allowAiOcr: true,
      allowWebhookPayment: true,
      isActive: true,
    },
    create: {
      code: 'ENTERPRISE',
      name: 'Enterprise',
      description: 'Dành cho chuỗi hệ thống lớn, cần tuỳ biến cao',
      priceMonthly: 0,
      priceYearly: 0,
      maxRooms: 999999, // Unbounded
      maxStaff: 999999,
      allowAiOcr: true,
      allowWebhookPayment: true,
      isActive: true,
    },
  });

  console.log('Seeded STARTER and ENTERPRISE plans');
}

seedMissingPlans()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
