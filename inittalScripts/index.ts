import envConfig from '@src/config/env.config'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import { HashingService } from '@src/shared/modules/services/hashing.service'
import roleName from 'src/common/constants/role.constant'

const prisma = new PrismaService()
const hashingPassword = new HashingService()
const main = async () => {
  const roleCount = await prisma.role.count()
  if (roleCount > 0) {
    throw new Error('Roles Already Exit')
  }
  const roles = await prisma.role.createMany({
    data: [
      {
        id: roleName.ADMIN,
        name: roleName.ADMIN,
        description: 'Admin Role',
      },
      {
        id: roleName.LANDLORD,
        name: roleName.LANDLORD,
        description: 'Landlord Role',
      },
      {
        id: roleName.MANAGER,
        name: roleName.MANAGER,
        description: 'Manager Role',
      },
      {
        id: roleName.ACCOUNTANT,
        name: roleName.ACCOUNTANT,
        description: 'Accountant Role',
      },
      {
        id: roleName.MAINTENANCE_STAFF,
        name: roleName.MAINTENANCE_STAFF,
        description: 'Maintenance Staff Role',
      },
      {
        id: roleName.TENANT,
        name: roleName.TENANT,
        description: 'Tenant Role',
      },
    ],
  })

  const adminUser = await prisma.user.create({
    data: {
      email: envConfig.ADMIN_EMAIL,
      passwordHash: await hashingPassword.hash(envConfig.ADMIN_PASSWORD),
      fullName: envConfig.ADMIN_NAME,
      phone: envConfig.ADMIN_PHONE_NUMBER,
      systemRole: roleName.ADMIN, // Gán thẳng quyền hệ thống ở đây
    },
  })
  return {
    createRoleCount: roles.count,
    adminUser,
  }
}
main()
  .then(({ adminUser, createRoleCount }) => {
    console.log(`Created ${createRoleCount} roles`)
    console.log(`Created Admin User: ${adminUser.email}`)
  })
  .catch((error) => {
    console.error('Error during initialization:', error)
  })
