const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const migrationsToReset = [
    '20260707020000_add_auth_tokens',
    '20260712183000_add_debts_table',
    '20260716183000_add_ticket_notification_fields',
    '20260716203000_add_dashboard_indexes',
    '20260726090000_add_subscription_payos_billing'
  ];
  
  console.log('Bắt đầu xóa các bản ghi migration bị lỗi checksum...');
  for (const m of migrationsToReset) {
    await prisma.$executeRawUnsafe(`DELETE FROM "_prisma_migrations" WHERE migration_name = $1`, m);
    console.log(`Đã xóa khỏi lịch sử: ${m}`);
  }
  console.log('Hoàn thành xóa lịch sử!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
