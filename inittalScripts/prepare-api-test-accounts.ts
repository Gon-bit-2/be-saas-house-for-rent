import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient } from '../generated/prisma/client'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required')
if (process.env.NODE_ENV === 'production') throw new Error('Refusing to prepare API test accounts in production')
if (!process.argv.includes('--confirm-dev-db')) {
  throw new Error('Refusing to mutate the database without --confirm-dev-db')
}

function option(name: string, envName: string) {
  const index = process.argv.indexOf(`--${name}`)
  const value = index >= 0 ? process.argv[index + 1] : process.env[envName]
  return value?.trim().toLowerCase()
}

function requiredOption(name: string, envName: string) {
  const value = option(name, envName)
  if (!value) throw new Error(`Missing --${name} or ${envName}`)
  return value
}

const adminEmail = option('admin-email', 'API_TEST_ADMIN_EMAIL')
const landlordEmail = requiredOption('landlord-email', 'API_TEST_LANDLORD_EMAIL')
const renterEmail = requiredOption('renter-email', 'API_TEST_RENTER_EMAIL')
const allowedTestEmails = new Set(
  (process.env.TEST_ACCOUNT_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
)

for (const [label, email] of [
  ['landlord', landlordEmail],
  ['renter', renterEmail],
] as const) {
  if (!allowedTestEmails.has(email)) {
    throw new Error(`${label} email must be listed in TEST_ACCOUNT_EMAILS before this script can update it`)
  }
}

const pool = new Pool({ connectionString: databaseUrl })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
const requiredWorkflowPermissions = [
  {
    roleIds: ['TENANT'],
    module: 'TICKETS',
    codes: [
      '/tickets/me/:id/close_PATCH',
      '/tickets/me/:id/reopen_PATCH',
      '/tickets/me/:id/cancel_PATCH',
      '/tickets/me/:id/history_GET',
    ],
  },
  {
    roleIds: ['TENANT'],
    module: 'REVIEWS',
    codes: ['/reviews_POST', '/reviews/me/:id_GET'],
  },
  {
    roleIds: ['ADMIN'],
    module: 'REVIEWS',
    codes: ['/reviews/admin/:id_GET', '/reviews/admin/:id/status_PATCH'],
  },
  {
    roleIds: ['TENANT'],
    module: 'REPORTS',
    codes: ['/reports_POST', '/reports/me/:id_GET'],
  },
  {
    roleIds: ['ADMIN'],
    module: 'REPORTS',
    codes: ['/reports/admin/:id_GET', '/reports/admin/:id/status_PATCH'],
  },
  {
    roleIds: ['TENANT'],
    module: 'NOTIFICATIONS',
    codes: [
      '/notifications_GET',
      '/notifications/unread-count_GET',
      '/notifications/:id/read_PATCH',
      '/notifications/read-all_PATCH',
    ],
  },
  {
    roleIds: ['TENANT'],
    module: 'CONTRACT_TERMINATIONS',
    codes: ['/contract-terminations/me_POST', '/contract-terminations/me/:id/cancel_PATCH'],
  },
  {
    roleIds: ['LANDLORD'],
    module: 'CONTRACT_TERMINATIONS',
    codes: [
      '/contract-terminations/:id/approve_PATCH',
      '/contract-terminations/:id/reject_PATCH',
      '/contract-terminations/:id/complete_PATCH',
    ],
  },
] as const
const now = new Date()
const expiredAt = new Date(now)
expiredAt.setUTCFullYear(expiredAt.getUTCFullYear() + 1)

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    const roles = await tx.role.findMany({
      where: { id: { in: ['ADMIN', 'LANDLORD', 'TENANT'] } },
      select: { id: true, _count: { select: { permissions: true } } },
    })
    const roleById = new Map(roles.map((role) => [role.id, role]))
    for (const roleId of ['ADMIN', 'LANDLORD', 'TENANT']) {
      const role = roleById.get(roleId)
      if (!role) throw new Error(`Role ${roleId} is missing. Run permission:sync first.`)
      if (role._count.permissions === 0)
        throw new Error(`Role ${roleId} has no permissions. Run permission:sync first.`)
    }

    const [landlord, renter] = await Promise.all([
      tx.user.findUnique({ where: { email: landlordEmail } }),
      tx.user.findUnique({ where: { email: renterEmail } }),
    ])
    if (!landlord) throw new Error(`Landlord account does not exist: ${landlordEmail}`)
    if (!renter) throw new Error(`Renter account does not exist: ${renterEmail}`)
    if (landlord.id === renter.id) throw new Error('Landlord and renter must be different accounts')

    await Promise.all([
      tx.user.update({
        where: { id: landlord.id },
        data: { status: 'ACTIVE', emailVerifiedAt: landlord.emailVerifiedAt ?? now, deletedAt: null },
      }),
      tx.user.update({
        where: { id: renter.id },
        data: {
          systemRole: 'TENANT',
          status: 'ACTIVE',
          emailVerifiedAt: renter.emailVerifiedAt ?? now,
          deletedAt: null,
        },
      }),
      tx.renterProfile.upsert({
        where: { userId: renter.id },
        create: { userId: renter.id, verificationStatus: 'VERIFIED' },
        update: { verificationStatus: 'VERIFIED' },
      }),
    ])

    if (adminEmail) {
      const admin = await tx.user.findUnique({ where: { email: adminEmail } })
      if (!admin) throw new Error(`Admin account does not exist: ${adminEmail}`)
      await tx.user.update({
        where: { id: admin.id },
        data: { systemRole: 'ADMIN', status: 'ACTIVE', emailVerifiedAt: admin.emailVerifiedAt ?? now, deletedAt: null },
      })
    }

    let membership = await tx.tenantMember.findFirst({
      where: {
        userId: landlord.id,
        roleId: 'LANDLORD',
        status: 'ACTIVE',
        tenant: { status: 'ACTIVE', deletedAt: null },
      },
      include: { tenant: true },
      orderBy: { id: 'asc' },
    })

    if (!membership) {
      const slug = `api-test-landlord-${landlord.id}`
      const existingTenant = await tx.tenant.findUnique({ where: { slug } })
      if (existingTenant && existingTenant.ownerUserId !== landlord.id) {
        throw new Error(`Safety check failed: tenant slug ${slug} belongs to another user`)
      }
      const tenant = await tx.tenant.upsert({
        where: { slug },
        create: {
          ownerUserId: landlord.id,
          name: `API Test Tenant ${landlord.id}`,
          slug,
          email: landlord.email,
          phone: landlord.phone,
          address: 'Disposable tenant for real API workflow tests',
          status: 'ACTIVE',
          verificationStatus: 'VERIFIED',
          createdById: adminEmail
            ? (await tx.user.findUniqueOrThrow({ where: { email: adminEmail } })).id
            : landlord.id,
        },
        update: {
          ownerUserId: landlord.id,
          status: 'ACTIVE',
          verificationStatus: 'VERIFIED',
          deletedAt: null,
        },
      })
      membership = await tx.tenantMember.upsert({
        where: { tenantId_userId: { tenantId: tenant.id, userId: landlord.id } },
        create: {
          tenantId: tenant.id,
          userId: landlord.id,
          roleId: 'LANDLORD',
          status: 'ACTIVE',
          joinedAt: now,
        },
        update: { roleId: 'LANDLORD', status: 'ACTIVE', joinedAt: now },
        include: { tenant: true },
      })
    } else if (membership.tenant.verificationStatus !== 'VERIFIED') {
      await tx.tenant.update({
        where: { id: membership.tenantId },
        data: { status: 'ACTIVE', verificationStatus: 'VERIFIED', deletedAt: null },
      })
    }

    const roomCount = await tx.room.count({
      where: { tenantId: membership.tenantId, deletedAt: null },
    })
    let subscription = await tx.subscription.findFirst({
      where: {
        tenantId: membership.tenantId,
        status: 'ACTIVE',
        expiredAt: { gt: now },
      },
      include: { plan: true },
      orderBy: { id: 'desc' },
    })

    if (!subscription) {
      const availablePlan = await tx.plan.findFirst({
        where: { isActive: true, maxRooms: { gte: roomCount + 2 } },
        orderBy: [{ maxRooms: 'desc' }, { id: 'asc' }],
      })
      if (!availablePlan) {
        throw new Error(`No active plan has capacity for at least ${roomCount + 2} rooms`)
      }
      const created = await tx.subscription.create({
        data: {
          tenantId: membership.tenantId,
          planId: availablePlan.id,
          status: 'ACTIVE',
          startedAt: now,
          expiredAt,
          billingCycle: 'YEARLY',
          autoRenew: false,
        },
      })
      subscription = { ...created, plan: availablePlan }
    }

    if (subscription.plan.maxRooms < roomCount + 2) {
      throw new Error(
        `Active plan ${subscription.plan.code} has no capacity for two workflow-test rooms; assign a larger plan first`,
      )
    }

    const ensuredPermissions: Array<{ code: string; roleId: string }> = []
    for (const group of requiredWorkflowPermissions) {
      for (const code of group.codes) {
        const method = code.slice(code.lastIndexOf('_') + 1)
        const permission = await tx.permission.upsert({
          where: { code },
          create: {
            code,
            name: `${method} ${code.slice(0, code.lastIndexOf('_'))}`.slice(0, 100),
            module: group.module,
            description: `API_E2E_REQUIRED_PERMISSION: ${code}`,
          },
          update: {},
        })
        await tx.rolePermission.createMany({
          data: group.roleIds.map((roleId) => ({ roleId, permissionId: permission.id })),
          skipDuplicates: true,
        })
        ensuredPermissions.push(...group.roleIds.map((roleId) => ({ code, roleId })))
      }
    }

    return {
      adminEmail: adminEmail ?? null,
      landlord: { id: landlord.id, email: landlord.email, tenantId: membership.tenantId, memberId: membership.id },
      renter: { id: renter.id, email: renter.email },
      plan: { id: subscription.plan.id, code: subscription.plan.code, subscriptionId: subscription.id },
      permissionCounts: Object.fromEntries(roles.map((role) => [role.id, role._count.permissions])),
      ensuredPermissions,
    }
  })

  console.log(JSON.stringify(result, null, 2))
}

main()
  .catch((error: unknown) => {
    console.error('Failed to prepare API test accounts:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
