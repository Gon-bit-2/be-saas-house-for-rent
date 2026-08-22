import { BullModule } from '@nestjs/bullmq'
import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AccessTokenGuard } from './common/guard/access-token.guard'
import { ApiKeyGuard } from './common/guard/api-key.guard'
import { AuthenticationGuard } from './common/guard/authentication.guard'
import { PaymentApiKeyGuard } from './common/guard/payment-api-key.guard'
import { RolesGuard } from './common/guard/roles.guard'
import envConfig from './config/env.config'
import { AmenitiesModule } from './modules/amenities/amenities.module'
import { AssetsModule } from './modules/assets/assets.module'
import { AuthModule } from './modules/auth/auth.module'
import { ContractsModule } from './modules/contracts/contracts.module'
import { ContractTerminationsModule } from './modules/contract-terminations/contract-terminations.module'
import { DashboardModule } from './modules/dashboard/dashboard.module'
import { InvoicesModule } from './modules/invoices/invoices.module'
import { LocationsModule } from './modules/locations/locations.module'
import { HandoversModule } from './modules/handovers/handovers.module'
import { MarketplaceModule } from './modules/marketplace/marketplace.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { OcrModule } from './modules/ocr/ocr.module'
import { PaymentsModule } from './modules/payments/payments.module'
import { PlansModule } from './modules/plans/plans.module'
import { PropertiesModule } from './modules/properties/properties.module'
import { SubscriptionPaymentsModule } from './modules/subscription-payments/subscription-payments.module'
import { RentalRequestsModule } from './modules/rental-requests/rental-requests.module'
import { ReportsModule } from './modules/reports/reports.module'
import { RentersModule } from './modules/renters/renters.module'
import { ServiceChargesModule } from './modules/service-charges/service-charges.module'
import { RoomsModule } from './modules/rooms/rooms.module'
import { ReviewsModule } from './modules/reviews/reviews.module'
import { TenantsModule } from './modules/tenants/tenants.module'
import { TicketsModule } from './modules/tickets/tickets.module'
import { UtilityMetersModule } from './modules/utility-meters/utility-meters.module'
import { UsersModule } from './modules/users/users.module'
import { ConversationsModule } from './modules/conversations/conversations.module'
import { DatabaseModule } from './shared/modules/database/prisma.module'
import { SharedServiceModule } from './shared/modules/services/shared-service.module'
import { RedisThrottlerStorage, redisThrottlerStorage } from './common/rate-limit/redis-throttler.storage'

function buildRedisConnection() {
  if (envConfig.REDIS_URL) {
    const url = new URL(envConfig.REDIS_URL)
    return {
      host: url.hostname,
      port: Number(url.port || 6379),
      username: url.username ? decodeURIComponent(url.username) : undefined,
      password: url.password ? decodeURIComponent(url.password) : undefined,
      tls: url.protocol === 'rediss:' ? {} : undefined,
    }
  }

  return {
    host: envConfig.REDIS_HOST,
    port: envConfig.REDIS_PORT,
    username: envConfig.REDIS_USERNAME || undefined,
    password: envConfig.REDIS_PASSWORD || undefined,
  }
}

@Module({
  imports: [
    CacheModule.register(),
    ThrottlerModule.forRoot({
      storage: redisThrottlerStorage,
      throttlers: [
        {
          name: 'global',
          ttl: envConfig.RATE_LIMIT_GLOBAL_TTL_MS,
          limit: envConfig.RATE_LIMIT_GLOBAL_LIMIT,
        },
      ],
    }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: buildRedisConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 3_000, jitter: 0.5 },
        removeOnComplete: 1_000,
        removeOnFail: 5_000,
      },
    }),
    DatabaseModule,
    SharedServiceModule,
    AuthModule,
    PlansModule,
    TenantsModule,
    UsersModule,
    PropertiesModule,
    RoomsModule,
    AmenitiesModule,
    AssetsModule,
    MarketplaceModule,
    NotificationsModule,
    OcrModule,
    PaymentsModule,
    SubscriptionPaymentsModule,
    RentersModule,
    ServiceChargesModule,
    RentalRequestsModule,
    ReviewsModule,
    ReportsModule,
    ContractsModule,
    HandoversModule,
    ContractTerminationsModule,
    DashboardModule,
    UtilityMetersModule,
    InvoicesModule,
    LocationsModule,
    TicketsModule,
    ConversationsModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: RedisThrottlerStorage, useValue: redisThrottlerStorage },
    AppService,
    AccessTokenGuard,
    ApiKeyGuard,
    PaymentApiKeyGuard,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
