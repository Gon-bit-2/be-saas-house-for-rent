import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ThrottlerException } from '@nestjs/throttler'
import { createHmac } from 'crypto'
import type { Request, Response } from 'express'
import envConfig from '@src/config/env.config'
import { AUTH_RATE_LIMIT_KEY, type AuthRateLimitProfile } from './auth-rate-limit.decorator'
import { RedisThrottlerStorage } from './redis-throttler.storage'

type Bucket = { suffix: string; value: string; limit: number; ttl: number }

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(AuthRateLimitGuard.name)
  constructor(
    private readonly reflector: Reflector,
    private readonly storage: RedisThrottlerStorage,
  ) {}

  async canActivate(context: ExecutionContext) {
    const profile = this.reflector.getAllAndOverride<AuthRateLimitProfile>(AUTH_RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!profile) return true

    const request = context.switchToHttp().getRequest<Request>()
    const response = context.switchToHttp().getResponse<Response>()
    const buckets = this.buildBuckets(profile, request)
    let retryAfter = 0

    for (const bucket of buckets) {
      const tracker = this.digest(bucket.value)
      const result = await this.storage.increment(
        `auth:${profile}:${bucket.suffix}:${tracker}`,
        bucket.ttl,
        bucket.limit,
        bucket.ttl,
        'auth',
      )
      if (result.isBlocked) {
        retryAfter = Math.max(retryAfter, result.timeToBlockExpire)
      }
    }

    if (retryAfter > 0) {
      this.logger.warn(`security_event=auth_rate_limited profile=${profile} retry_after=${retryAfter}`)
      response.setHeader('Retry-After', retryAfter)
      throw new ThrottlerException('Quá nhiều yêu cầu. Vui lòng thử lại sau.')
    }
    return true
  }

  private buildBuckets(profile: AuthRateLimitProfile, request: Request): Bucket[] {
    const ip = request.ip || request.socket.remoteAddress || 'unknown'
    const body = (request.body ?? {}) as Record<string, unknown>
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : 'missing'
    const refreshToken = typeof body.refreshToken === 'string' ? body.refreshToken : 'missing'
    const device = `${ip}|${request.headers['user-agent'] ?? 'unknown'}`

    switch (profile) {
      case 'login':
      case 'verify':
        return [
          {
            suffix: 'email',
            value: email,
            limit: envConfig.AUTH_VERIFY_EMAIL_LIMIT,
            ttl: envConfig.AUTH_VERIFY_TTL_MS,
          },
          { suffix: 'ip', value: ip, limit: envConfig.AUTH_VERIFY_IP_LIMIT, ttl: envConfig.AUTH_VERIFY_TTL_MS },
          { suffix: 'device', value: device, limit: envConfig.AUTH_DEVICE_LIMIT, ttl: envConfig.AUTH_VERIFY_TTL_MS },
        ]
      case 'otp':
        return [
          { suffix: 'cooldown', value: email, limit: 1, ttl: envConfig.AUTH_OTP_COOLDOWN_MS },
          { suffix: 'email', value: email, limit: envConfig.AUTH_OTP_EMAIL_LIMIT, ttl: envConfig.AUTH_OTP_TTL_MS },
          { suffix: 'ip', value: ip, limit: envConfig.AUTH_OTP_IP_LIMIT, ttl: envConfig.AUTH_OTP_TTL_MS },
          { suffix: 'device', value: device, limit: envConfig.AUTH_OTP_DEVICE_LIMIT, ttl: envConfig.AUTH_OTP_TTL_MS },
        ]
      case 'refresh':
        return [
          {
            suffix: 'token',
            value: refreshToken,
            limit: envConfig.AUTH_REFRESH_TOKEN_LIMIT,
            ttl: envConfig.AUTH_REFRESH_TTL_MS,
          },
          { suffix: 'ip', value: ip, limit: envConfig.AUTH_REFRESH_IP_LIMIT, ttl: envConfig.AUTH_REFRESH_TTL_MS },
          {
            suffix: 'device',
            value: device,
            limit: envConfig.AUTH_REFRESH_DEVICE_LIMIT,
            ttl: envConfig.AUTH_REFRESH_TTL_MS,
          },
        ]
    }
  }

  private digest(value: string) {
    return createHmac('sha256', envConfig.ACCESS_TOKEN_SECRET).update(value).digest('hex')
  }
}
