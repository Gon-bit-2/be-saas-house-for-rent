import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager'
import { Reflector } from '@nestjs/core'
import { Request } from 'express'
import { HTTPMethod } from '@src/common/constants/role.constant'
import roleName from '@src/common/constants/role.constant'
import { REQUEST_ROLE_PERMISSIONS, REQUEST_USER_KEY } from '@src/common/constants/auth.constant'
import { ROLES_KEY } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload, DecodedAccessToken } from '@src/common/types/jwt.type'
import { TokenService } from '@src/shared/modules/services/token.service'
import { PrismaService } from '@src/shared/modules/database/prisma.service'
import envConfig from '@src/config/env.config'
import type { Prisma } from 'generated/prisma/client'

type RolePermissionType = Prisma.RoleGetPayload<{
  include: { permissions: { include: { permission: true } } }
}>
type PermissionEntry = RolePermissionType['permissions'][number]
type CachedRole = Omit<RolePermissionType, 'permissions'> & {
  permissions: Record<string, PermissionEntry>
}
type AuthenticatedRequest = Request & {
  [REQUEST_USER_KEY]?: AccessTokenPayload
  [REQUEST_ROLE_PERMISSIONS]?: RolePermissionType
}

function normalizeRouteSegment(value?: string) {
  if (!value || value === '/' || value === '/*') return ''
  return value.startsWith('/') ? value : `/${value}`
}

export function getPermissionPath(request: { baseUrl?: string; route?: { path?: string | string[] } }) {
  const baseUrl = normalizeRouteSegment(request.baseUrl)
  const routePath = Array.isArray(request.route?.path) ? request.route?.path[0] : request.route?.path
  const joinedPath = `${baseUrl}${normalizeRouteSegment(routePath)}` || '/'
  return joinedPath.replace(/\/{2,}/g, '/')
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  private readonly logger = new Logger(AccessTokenGuard.name)
  constructor(
    private readonly tokenService: TokenService,
    private readonly prismaService: PrismaService,
    private readonly reflector: Reflector,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const decoded = await this.extractAndValidateToken(request)
    const principal = await this.resolvePrincipal(decoded, request, context)
    request[REQUEST_USER_KEY] = principal
    await this.validateUserPermission(principal, request)
    return true
  }

  private async extractAndValidateToken(request: AuthenticatedRequest): Promise<DecodedAccessToken> {
    const accessToken = this.extractTokenFromHeader(request)
    try {
      const decoded = await this.tokenService.verifyAccessToken(accessToken)
      if (decoded.ver !== 2) {
        const graceUntil = envConfig.LEGACY_ACCESS_TOKEN_GRACE_UNTIL
        if (!graceUntil || Date.now() > new Date(graceUntil).getTime()) {
          throw new Error('Legacy access token expired')
        }
      }
      return decoded
    } catch {
      throw new UnauthorizedException('Error.InvalidAccessToken')
    }
  }

  private extractTokenFromHeader(request: AuthenticatedRequest): string {
    const [scheme, token] = request.headers.authorization?.split(' ') ?? []
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Error.MissingAccessToken')
    }
    return token
  }

  private async resolvePrincipal(
    decoded: DecodedAccessToken,
    request: AuthenticatedRequest,
    context: ExecutionContext,
  ): Promise<AccessTokenPayload> {
    const user = await this.prismaService.user.findFirst({
      where: { id: decoded.userId, status: 'ACTIVE', deletedAt: null },
      select: {
        id: true,
        systemRole: true,
        renterProfile: { select: { id: true } },
      },
    })
    if (!user) {
      throw new UnauthorizedException('Error.InvalidAccessToken')
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    const tenantHeader = request.headers['x-tenant-id']
    if (tenantHeader !== undefined) {
      const tenantId = this.parseTenantId(tenantHeader)
      const member = await this.prismaService.tenantMember.findFirst({
        where: {
          userId: user.id,
          tenantId,
          status: 'ACTIVE',
          tenant: { status: 'ACTIVE', deletedAt: null },
        },
        select: {
          id: true,
          tenantId: true,
          roleId: true,
          role: { select: { name: true } },
        },
      })
      if (!member) {
        this.logger.warn(`security_event=tenant_context_denied user_id=${user.id} tenant_id=${tenantId}`)
        throw new ForbiddenException('TENANT_ACCESS_DENIED')
      }
      return {
        userId: user.id,
        deviceId: decoded.deviceId,
        ver: decoded.ver ?? 1,
        jti: decoded.jti,
        exp: decoded.exp,
        iat: decoded.iat,
        contextKind: 'TENANT',
        tenantId: member.tenantId,
        memberId: member.id,
        roleId: member.roleId,
        roleName: member.role.name,
      }
    }

    const staffRoleRequired =
      requiredRoles?.some((role) => role !== roleName.ADMIN && role !== roleName.TENANT) === true
    const renterAllowed = requiredRoles?.includes(roleName.TENANT) === true
    if (staffRoleRequired && !renterAllowed) {
      this.logger.warn(`security_event=tenant_context_missing user_id=${user.id}`)
      throw new BadRequestException('TENANT_CONTEXT_REQUIRED')
    }

    if (requiredRoles?.includes(roleName.ADMIN) || user.systemRole === roleName.ADMIN) {
      if (user.systemRole !== roleName.ADMIN) {
        throw new ForbiddenException('Error.PermissionDenied')
      }
      return this.buildNonTenantPrincipal(decoded, user.id, 'SYSTEM', roleName.ADMIN)
    }

    if (renterAllowed) {
      if (!user.renterProfile) {
        throw new ForbiddenException('Error.PermissionDenied')
      }
      return this.buildNonTenantPrincipal(decoded, user.id, 'RENTER', roleName.TENANT)
    }

    if (user.systemRole) {
      return this.buildNonTenantPrincipal(decoded, user.id, 'SYSTEM', user.systemRole)
    }
    if (user.renterProfile) {
      return this.buildNonTenantPrincipal(decoded, user.id, 'RENTER', roleName.TENANT)
    }
    return {
      userId: user.id,
      deviceId: decoded.deviceId,
      ver: decoded.ver ?? 1,
      jti: decoded.jti,
      exp: decoded.exp,
      iat: decoded.iat,
      contextKind: 'IDENTITY',
      roleName: '',
    }
  }

  private parseTenantId(value: string | string[]): number {
    if (Array.isArray(value) || !/^[1-9]\d*$/.test(value)) {
      throw new BadRequestException('TENANT_CONTEXT_REQUIRED')
    }
    const tenantId = Number(value)
    if (!Number.isSafeInteger(tenantId)) {
      throw new BadRequestException('TENANT_CONTEXT_REQUIRED')
    }
    return tenantId
  }

  private buildNonTenantPrincipal(
    decoded: DecodedAccessToken,
    userId: number,
    contextKind: 'SYSTEM' | 'RENTER',
    roleId: string,
  ): AccessTokenPayload {
    return {
      userId,
      deviceId: decoded.deviceId,
      ver: decoded.ver ?? 1,
      jti: decoded.jti,
      exp: decoded.exp,
      iat: decoded.iat,
      contextKind,
      roleId,
      roleName: roleId,
    }
  }

  private async validateUserPermission(principal: AccessTokenPayload, request: AuthenticatedRequest) {
    if (!principal.roleId) return

    const path = getPermissionPath(request)
    const cacheKey = `roleId:${principal.roleId}`
    const method = request.method as keyof typeof HTTPMethod
    let cachedRole = await this.cacheManager.get<CachedRole>(cacheKey)

    if (!cachedRole) {
      const role = await this.prismaService.role
        .findUniqueOrThrow({
          where: { id: principal.roleId },
          include: { permissions: { include: { permission: true } } },
        })
        .catch(() => {
          throw new ForbiddenException('Error.Forbidden')
        })
      const permissionObject: CachedRole['permissions'] = {}
      for (const entry of role.permissions) {
        permissionObject[entry.permission.code] = entry
      }
      cachedRole = {
        ...role,
        permissions: permissionObject,
      }
      await this.cacheManager.set(cacheKey, cachedRole, 60_000)
      request[REQUEST_ROLE_PERMISSIONS] = role
    }

    if (!cachedRole.permissions[`${path}_${method}`]) {
      throw new ForbiddenException('Error.Forbidden')
    }
  }
}
