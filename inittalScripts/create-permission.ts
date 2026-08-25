import { NestFactory } from '@nestjs/core'
import { AppModule } from 'src/app.module'
import roleName, { HTTPMethod, RoleNameType } from 'src/common/constants/role.constant'
import { PrismaService } from '@src/shared/modules/database/prisma.service'

type RouteLayer = {
  route?: {
    path?: string | string[]
    methods?: Record<string, boolean>
    stack?: Array<{ method?: string }>
  }
}

type ExpressLikeServer = {
  router?: { stack?: RouteLayer[] }
  _router?: { stack?: RouteLayer[] }
}

type AvailableRoute = {
  code: string
  path: string
  method: keyof typeof HTTPMethod
  name: string
  module: string
  description: string
}

type PermissionForRole = {
  id: number
  code: string
  module: string
}

const commonPermissionCodes = ['/_GET', '/auth/logout_POST', '/auth/profile_GET', '/auth/profile_PATCH']

const roleDescriptions: Record<RoleNameType, string> = {
  [roleName.ADMIN]: 'Quản trị viên hệ thống, có toàn quyền truy cập tất cả API.',
  [roleName.LANDLORD]: 'Chủ trọ hoặc chủ tổ chức quản lý phòng trọ.',
  [roleName.MANAGER]: 'Nhân viên quản lý vận hành trong tenant.',
  [roleName.ACCOUNTANT]: 'Nhân viên kế toán, phụ trách hóa đơn và thanh toán.',
  [roleName.MAINTENANCE_STAFF]: 'Nhân viên bảo trì, phụ trách sự cố và tài sản.',
  [roleName.TENANT]: 'Khách thuê sử dụng marketplace và các chức năng cá nhân.',
}

const roleModuleMap: Record<RoleNameType, string[]> = {
  [roleName.ADMIN]: [],
  [roleName.LANDLORD]: [
    'TENANTS',
    'TENANT_MEMBERS',
    'PROPERTIES',
    'FLOORS',
    'ROOMS',
    'AMENITIES',
    'ROOM_ASSETS',
    'ASSETS',
    'ASSET_CATEGORIES',
    'UTILITY_METERS',
    'METER_READINGS',
    'OCR',
    'INVOICES',
    'INVOICE_BATCHES',
    'SERVICE_CATALOG',
    'SERVICE_ASSIGNMENTS',
    'PAYMENTS',
    'PAYMENT_QR_CODES',
    'SUBSCRIPTIONS',
    'SUBSCRIPTION_PAYMENTS',
    'TICKETS',
    'CONTRACTS',
    'CONTRACT_TEMPLATES',
    'HANDOVER_RECORDS',
    'HANDOVERS',
    'CONTRACT_TERMINATIONS',
    'ROOM_VIEWING_APPOINTMENTS',
    'RENTAL_REQUESTS',
    'RENTERS',
    'CONVERSATIONS',
    'NOTIFICATIONS',
    'DASHBOARD',
    'ROLES',
  ],
  [roleName.MANAGER]: [
    'PROPERTIES',
    'FLOORS',
    'ROOMS',
    'AMENITIES',
    'ROOM_ASSETS',
    'ASSETS',
    'ASSET_CATEGORIES',
    'UTILITY_METERS',
    'METER_READINGS',
    'SERVICE_CATALOG',
    'SERVICE_ASSIGNMENTS',
    'TICKETS',
    'CONTRACTS',
    'HANDOVER_RECORDS',
    'HANDOVERS',
    'CONTRACT_TERMINATIONS',
    'ROOM_VIEWING_APPOINTMENTS',
    'RENTAL_REQUESTS',
    'RENTERS',
    'CONVERSATIONS',
    'NOTIFICATIONS',
    'DASHBOARD',
    'ROLES',
  ],
  [roleName.ACCOUNTANT]: [
    'INVOICES',
    'INVOICE_BATCHES',
    'SERVICE_CATALOG',
    'SERVICE_ASSIGNMENTS',
    'PAYMENTS',
    'PAYMENT_QR_CODES',
    'SUBSCRIPTIONS',
    'SUBSCRIPTION_PAYMENTS',
    'CONTRACTS',
    'METER_READINGS',
    'DASHBOARD',
  ],
  [roleName.MAINTENANCE_STAFF]: [
    'PROPERTIES',
    'ROOMS',
    'ROOM_ASSETS',
    'ASSETS',
    'UTILITY_METERS',
    'METER_READINGS',
    'TICKETS',
    'HANDOVER_RECORDS',
  ],
  [roleName.TENANT]: [
    'MARKETPLACE',
    'FAVORITE_ROOMS',
    'ROOM_VIEWING_APPOINTMENTS',
    'RENTAL_REQUESTS',
    'RENTERS',
    'CONTRACTS',
    'HANDOVERS',
    'CONTRACT_TERMINATIONS',
    'INVOICES',
    'PAYMENTS',
    'TICKETS',
    'CONVERSATIONS',
    'NOTIFICATIONS',
    'REVIEWS',
    'REPORTS',
  ],
}

function normalizeRoutePath(path: string) {
  if (!path || path === '*' || path === '/*') {
    return '/'
  }

  return (path.startsWith('/') ? path : `/${path}`).replace(/\/{2,}/g, '/')
}

function getModuleName(path: string) {
  return path.split('/').filter(Boolean)[0]?.replace(/-/g, '_').toUpperCase() ?? 'ROOT'
}

function getRouteMethods(route: NonNullable<RouteLayer['route']>) {
  const routeMethods = Object.entries(route.methods ?? {})
    .filter(([, enabled]) => enabled)
    .map(([method]) => method.toUpperCase())

  const stackMethods = (route.stack ?? []).map((item) => item.method?.toUpperCase()).filter(Boolean) as string[]
  const methods = routeMethods.length > 0 ? routeMethods : stackMethods

  return Array.from(new Set(methods)).filter((method): method is keyof typeof HTTPMethod => method in HTTPMethod)
}

function getAvailableRoutes(server: ExpressLikeServer): AvailableRoute[] {
  const routerStack = server.router?.stack ?? server._router?.stack
  if (!routerStack) {
    throw new Error('Cannot inspect Nest routes: Express router stack was not found.')
  }

  const availableRoutes: AvailableRoute[] = []

  for (const layer of routerStack) {
    if (!layer.route?.path) {
      continue
    }

    const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path]
    const methods = getRouteMethods(layer.route)

    for (const pathValue of paths) {
      const path = normalizeRoutePath(pathValue)
      const moduleName = getModuleName(path)

      for (const method of methods) {
        const code = `${path}_${method}`
        if (code.length > 100) {
          throw new Error(`Permission code exceeds 100 characters: ${code}`)
        }

        availableRoutes.push({
          code,
          path,
          method,
          name: `${method} ${path}`.slice(0, 100),
          module: moduleName.slice(0, 100),
          description: `AUTO_API_PERMISSION: ${method} ${path}`,
        })
      }
    }
  }

  return Array.from(new Map(availableRoutes.map((route) => [route.code, route])).values()).sort((a, b) =>
    a.code.localeCompare(b.code),
  )
}

async function upsertRoles(prisma: PrismaService) {
  for (const [id, description] of Object.entries(roleDescriptions)) {
    await prisma.role.upsert({
      where: { id },
      create: { id, name: id, description },
      update: { name: id, description },
    })
  }
}

function getPermissionIdsForRole(roleId: RoleNameType, permissions: PermissionForRole[]) {
  if (roleId === roleName.ADMIN) {
    return permissions.map((permission) => permission.id)
  }

  const allowedModules = roleModuleMap[roleId]
  return permissions
    .filter(
      (permission) =>
        commonPermissionCodes.includes(permission.code) || allowedModules.includes(permission.module.toUpperCase()),
    )
    .map((permission) => permission.id)
}

async function updateRole(prisma: PrismaService, roleId: RoleNameType, permissionIds: number[]) {
  await prisma.rolePermission.deleteMany({
    where: { roleId },
  })

  if (permissionIds.length > 0) {
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
      skipDuplicates: true,
    })
  }

  console.log(`Updated role ${roleId}: ${permissionIds.length} permissions`)
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: false })

  try {
    await app.init()

    const prisma = app.get(PrismaService)
    const server = app.getHttpAdapter().getInstance() as ExpressLikeServer
    const availableRoutes = getAvailableRoutes(server)

    console.log('Available route count:', availableRoutes.length)

    await upsertRoles(prisma)

    const permissionInDb = await prisma.permission.findMany({
      where: {
        code: {
          startsWith: '/',
        },
      },
    })

    const permissionInDbMap = permissionInDb.reduce<Record<string, (typeof permissionInDb)[number]>>((acc, item) => {
      acc[item.code] = item
      return acc
    }, {})

    const availableRoutesMap = availableRoutes.reduce<Record<string, AvailableRoute>>((acc, item) => {
      acc[item.code] = item
      return acc
    }, {})

    const permissionToDelete = permissionInDb.filter((item) => !availableRoutesMap[item.code])
    if (permissionToDelete.length > 0) {
      const deleteResult = await prisma.permission.deleteMany({
        where: {
          id: {
            in: permissionToDelete.map((item) => item.id),
          },
        },
      })
      console.log('Deleted permission count:', deleteResult.count)
    } else {
      console.log('No permission to delete')
    }

    const permissionToCreate = availableRoutes.filter((item) => !permissionInDbMap[item.code])
    if (permissionToCreate.length > 0) {
      const createResult = await prisma.permission.createMany({
        data: permissionToCreate.map(({ code, name, module, description }) => ({ code, name, module, description })),
        skipDuplicates: true,
      })
      console.log('Created permission count:', createResult.count)
    } else {
      console.log('No permission to create')
    }

    const permissionToUpdate = availableRoutes.filter((item) => permissionInDbMap[item.code])
    for (const permission of permissionToUpdate) {
      await prisma.permission.update({
        where: { code: permission.code },
        data: {
          name: permission.name,
          module: permission.module,
          description: permission.description,
        },
      })
    }
    console.log('Updated permission count:', permissionToUpdate.length)

    const updatedPermissionInDb = await prisma.permission.findMany({
      where: {
        code: {
          in: availableRoutes.map((item) => item.code),
        },
      },
      select: {
        id: true,
        code: true,
        module: true,
      },
    })

    await Promise.all(
      (Object.keys(roleDescriptions) as RoleNameType[]).map((roleId) =>
        updateRole(prisma, roleId, getPermissionIdsForRole(roleId, updatedPermissionInDb)),
      ),
    )
  } finally {
    await app.close()
  }
}

bootstrap().catch((error: unknown) => {
  console.error('Error during permission sync:', error)
  process.exit(1)
})
