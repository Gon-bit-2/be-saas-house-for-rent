import { SetMetadata } from '@nestjs/common'

export const AUTH_RATE_LIMIT_KEY = 'auth_rate_limit_profile'
export type AuthRateLimitProfile = 'login' | 'otp' | 'verify' | 'refresh'

export const AuthRateLimit = (profile: AuthRateLimitProfile) => SetMetadata(AUTH_RATE_LIMIT_KEY, profile)
