import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ThrottlerException } from '@nestjs/throttler'
import { REQUEST_USER_KEY } from '@src/common/constants/auth.constant'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import envConfig from '@src/config/env.config'
import { createHmac } from 'crypto'
import type { Request, Response } from 'express'
import { RedisThrottlerStorage } from './redis-throttler.storage'
import { RESOURCE_RATE_LIMIT_KEY, type ResourceRateLimitProfile } from './resource-rate-limit.decorator'

@Injectable()
export class ResourceRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(ResourceRateLimitGuard.name)

  constructor(
    private readonly reflector: Reflector,
    private readonly storage: RedisThrottlerStorage,
  ) {}

  async canActivate(context: ExecutionContext) {
    const profile = this.reflector.getAllAndOverride<ResourceRateLimitProfile>(RESOURCE_RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!profile) return true

    const request = context.switchToHttp().getRequest<Request & { [REQUEST_USER_KEY]?: AccessTokenPayload }>()
    const response = context.switchToHttp().getResponse<Response>()
    const principal = request[REQUEST_USER_KEY]
    const trackerValue = principal?.userId ? `user:${principal.userId}` : `ip:${request.ip || 'unknown'}`
    const ttl =
      profile === 'ocr-create'
        ? envConfig.OCR_RATE_TTL_MS
        : profile === 'trust-write'
          ? envConfig.TRUST_WRITE_RATE_TTL_MS
          : envConfig.TICKET_WRITE_RATE_TTL_MS
    const result = await this.storage.increment(
      `resource:${profile}:${this.digest(trackerValue)}`,
      ttl,
      this.limitFor(profile),
      ttl,
      'resource',
    )
    if (!result.isBlocked) return true

    response.setHeader('Retry-After', result.timeToBlockExpire)
    this.logger.warn(`security_event=resource_rate_limited profile=${profile} retry_after=${result.timeToBlockExpire}`)
    throw new ThrottlerException('Quá nhiều yêu cầu. Vui lòng thử lại sau.')
  }

  private limitFor(profile: ResourceRateLimitProfile) {
    if (profile === 'ocr-create') return envConfig.OCR_CREATE_RATE_LIMIT
    if (profile === 'ticket-create') return envConfig.TICKET_CREATE_RATE_LIMIT
    if (profile === 'ticket-comment') return envConfig.TICKET_COMMENT_RATE_LIMIT
    return envConfig.TICKET_ATTACHMENT_RATE_LIMIT
  }

  private digest(value: string) {
    return createHmac('sha256', envConfig.ACCESS_TOKEN_SECRET).update(value).digest('hex')
  }
}
