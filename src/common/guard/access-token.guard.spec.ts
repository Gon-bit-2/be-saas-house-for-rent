import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common'
import { AccessTokenGuard } from './access-token.guard'

jest.mock('@src/shared/modules/database/prisma.service', () => ({ PrismaService: class PrismaService {} }))
jest.mock('@src/shared/modules/services/token.service', () => ({ TokenService: class TokenService {} }))

function contextFor(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
  } as never
}

describe('AccessTokenGuard tenant context', () => {
  let tokenService: Record<string, jest.Mock>
  let prisma: {
    user: { findFirst: jest.Mock }
    tenantMember: { findFirst: jest.Mock }
    role: { findUniqueOrThrow: jest.Mock }
  }
  let reflector: { getAllAndOverride: jest.Mock }
  let cache: { get: jest.Mock; set: jest.Mock }
  let guard: import('./access-token.guard').AccessTokenGuard

  beforeEach(() => {
    tokenService = {
      verifyAccessToken: jest.fn().mockResolvedValue({ userId: 9, ver: 2, iat: 1, exp: 9999999999, jti: 'jti' }),
    }
    prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 9, systemRole: null, renterProfile: null }),
      },
      tenantMember: { findFirst: jest.fn() },
      role: { findUniqueOrThrow: jest.fn() },
    }
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(['LANDLORD']) }
    cache = {
      get: jest.fn().mockResolvedValue({
        id: 'LANDLORD',
        name: 'LANDLORD',
        description: null,
        permissions: {
          '/payments_GET': { permission: { code: '/payments_GET' } },
        },
      }),
      set: jest.fn(),
    }
    guard = new AccessTokenGuard(tokenService as never, prisma as never, reflector as never, cache as never)
  })

  it('requires X-Tenant-Id for a staff-only route', async () => {
    const request = {
      headers: { authorization: 'Bearer access' },
      method: 'GET',
      baseUrl: '/payments',
      route: { path: '/' },
    }
    await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(BadRequestException)
  })

  it('rejects an inactive or foreign membership', async () => {
    prisma.tenantMember.findFirst.mockResolvedValue(null)
    const request = {
      headers: { authorization: 'Bearer access', 'x-tenant-id': '3' },
      method: 'GET',
      baseUrl: '/payments',
      route: { path: '/' },
    }
    await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(ForbiddenException)
    expect(prisma.tenantMember.findFirst).toHaveBeenCalledTimes(1)
  })

  it('attaches the current membership and role to the request', async () => {
    prisma.tenantMember.findFirst.mockResolvedValue({
      id: 12,
      tenantId: 3,
      roleId: 'LANDLORD',
      role: { name: 'LANDLORD' },
    })
    const request: Record<string, unknown> & { user?: unknown } = {
      headers: { authorization: 'Bearer access', 'x-tenant-id': '3' },
      method: 'GET',
      baseUrl: '/payments',
      route: { path: '/' },
    }
    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true)
    expect(request.user).toEqual(
      expect.objectContaining({
        userId: 9,
        contextKind: 'TENANT',
        tenantId: 3,
        memberId: 12,
        roleId: 'LANDLORD',
      }),
    )
  })

  it('rejects a user that is no longer active', async () => {
    prisma.user.findFirst.mockResolvedValue(null)
    const request = { headers: { authorization: 'Bearer access' }, method: 'GET' }
    await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(UnauthorizedException)
  })
})
