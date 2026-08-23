import { PrismaClient } from './generated/prisma/client'
async function main() {
  const prisma = new PrismaClient()
  const perms = await prisma.permission.findMany()
  console.log('Total perms:', perms.length)
  const adminRole = await prisma.role.findUnique({
    where: { id: 'ADMIN' },
    include: { permissions: true }
  })
  console.log('Admin permissions:', adminRole?.permissions.length)
}
main().finally(() => process.exit(0))
