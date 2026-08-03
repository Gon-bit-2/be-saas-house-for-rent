import { SetMetadata } from '@nestjs/common'

export const RESOURCE_RATE_LIMIT_KEY = 'resource_rate_limit_profile'
export type ResourceRateLimitProfile =
  | 'ticket-create'
  | 'ticket-comment'
  | 'ticket-attachment'
  | 'ocr-create'
  | 'trust-write'

export const ResourceRateLimit = (profile: ResourceRateLimitProfile) => SetMetadata(RESOURCE_RATE_LIMIT_KEY, profile)
