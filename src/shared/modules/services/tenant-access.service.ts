import { Inject, ForbiddenException, Injectable, Scope } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'
import { REQUEST_USER_KEY } from '@src/common/constants/auth.constant'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import type { Request } from 'express'

export type TenantAccessContext = {
  tenantId: number
  memberId: number
  userId: number
  roleId: string
}

/**
 * Resolves the active tenant membership for tenant-scoped landlord APIs.
 */
type AuthenticatedRequest = Request & { [REQUEST_USER_KEY]?: AccessTokenPayload }

@Injectable({ scope: Scope.REQUEST })
export class TenantAccessService {
  constructor(@Inject(REQUEST) private readonly request: AuthenticatedRequest) {}

  /**
   * Returns the first active tenant membership for a user and rejects users outside tenant operations.
   */
  getActiveTenantContext(userId: number): Promise<TenantAccessContext> {
    const principal = this.request[REQUEST_USER_KEY]
    if (
      !principal ||
      principal.userId !== userId ||
      principal.contextKind !== 'TENANT' ||
      !principal.tenantId ||
      !principal.memberId ||
      !principal.roleId
    ) {
      throw new ForbiddenException('TENANT_ACCESS_DENIED')
    }

    return Promise.resolve({
      memberId: principal.memberId,
      tenantId: principal.tenantId,
      userId: principal.userId,
      roleId: principal.roleId,
    })
  }
}
