import { Global, Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { HashingService } from './hashing.service'
import { TokenService } from './token.service'
import { EmailService } from './email.service'
import { TenantAccessService } from './tenant-access.service'
import { CloudinaryService } from './cloudinary.service'
import { AuthRateLimitGuard } from '@src/common/rate-limit/auth-rate-limit.guard'
import { RedisThrottlerStorage, redisThrottlerStorage } from '@src/common/rate-limit/redis-throttler.storage'
import { ResourceRateLimitGuard } from '@src/common/rate-limit/resource-rate-limit.guard'

@Global()
@Module({
  imports: [JwtModule],
  providers: [
    HashingService,
    TokenService,
    EmailService,
    TenantAccessService,
    CloudinaryService,
    AuthRateLimitGuard,
    ResourceRateLimitGuard,
    {
      provide: RedisThrottlerStorage,
      useValue: redisThrottlerStorage,
    },
  ],
  exports: [
    HashingService,
    TokenService,
    EmailService,
    TenantAccessService,
    CloudinaryService,
    AuthRateLimitGuard,
    ResourceRateLimitGuard,
    RedisThrottlerStorage,
  ],
})
export class SharedServiceModule {}
