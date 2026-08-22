import { SetMetadata } from '@nestjs/common'

export const SKIP_PERMISSION_KEY = 'skipPermission'

/**
 * Decorator to bypass the dynamic permission check in AccessTokenGuard.
 * Use this for endpoints that require authentication but no specific role-based permissions.
 */
export const SkipPermission = () => SetMetadata(SKIP_PERMISSION_KEY, true)
