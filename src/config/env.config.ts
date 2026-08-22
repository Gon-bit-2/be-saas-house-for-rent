import z from 'zod'
import 'dotenv/config'
import { Logger } from '@nestjs/common'

const logger = new Logger('Config')
const ConfigSchema = z
  .object({
    DATABASE_URL: z.string(),
    DB_POOL_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
    DB_POOL_MAX: z.coerce.number().int().positive().default(10),
    ACCESS_TOKEN_SECRET: z.string(),
    ACCESS_TOKEN_EXPIRES_IN: z.string(),
    LEGACY_ACCESS_TOKEN_GRACE_UNTIL: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().datetime().optional(),
    ),
    REFRESH_TOKEN_SECRET: z.string(),
    REFRESH_TOKEN_EXPIRES_IN: z.string(),
    API_KEY_SECRET: z.string(),
    PAYMENT_API_KEY: z.string(),
    ADMIN_NAME: z.string(),
    ADMIN_PASSWORD: z.string(),
    ADMIN_EMAIL: z.string(),
    ADMIN_PHONE_NUMBER: z.string(),
    OTP_EXPIRES_IN: z.string(),
    OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
    RENTER_INVITATION_EXPIRE_MINUTES: z.coerce.number().int().positive().max(1440).default(30),
    RESEND_API_KEY: z.string(),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    GOOGLE_REDIRECT_URI: z.string(),
    GOOGLE_CLIENT_REDIRECT_URI: z.string(),
    GOOGLE_ANDROID_CLIENT_REDIRECT_URI: z.string().default('chuyende2://oauth/google'),
    GOOGLE_OAUTH_SCOPES: z
      .string()
      .default('https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'),
    GOOGLE_SESSION_EXPIRES_IN: z.string().default('5m'),
    GOOGLE_STATE_EXPIRES_IN: z.string().default('5m'),
    GOOGLE_USERINFO_URL: z.string().url().default('https://openidconnect.googleapis.com/v1/userinfo'),
    GOOGLE_OAUTH_TOKEN_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
    GOOGLE_USERINFO_TIMEOUT_MS: z.coerce.number().int().positive().default(3_000),
    GOOGLE_USERINFO_MAX_RETRIES: z.coerce.number().int().min(0).max(2).default(1),
    REDIS_USERNAME: z.string(),
    REDIS_PASSWORD: z.string(),
    REDIS_HOST: z.string(),
    REDIS_PORT: z.coerce.number(),
    STRIPE_SECRET_KEY: z.string(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    CLOUDINARY_CLOUD_NAME: z.string(),
    CLOUDINARY_API_KEY: z.string(),
    CLOUDINARY_API_SECRET: z.string(),
    GOONG_MAPS_API_KEY: z.string(),
    GOONG_BASE_URL: z.string(),
    OSRM_BASE_URL: z.string().default('http://router.project-osrm.org'),
    NODE_ENV: z.string().optional(),
    PORT: z.coerce.number().int().positive().default(3000),
    CORS_ORIGINS: z.string().default(''),
    REDIS_URL: z.string().optional(),
    TRUST_PROXY_HOPS: z.coerce.number().int().nonnegative().default(0),
    RATE_LIMIT_GLOBAL_LIMIT: z.coerce.number().int().positive().default(120),
    RATE_LIMIT_GLOBAL_TTL_MS: z.coerce.number().int().positive().default(60_000),
    AUTH_VERIFY_EMAIL_LIMIT: z.coerce.number().int().positive().default(5),
    AUTH_VERIFY_IP_LIMIT: z.coerce.number().int().positive().default(30),
    AUTH_DEVICE_LIMIT: z.coerce.number().int().positive().default(10),
    AUTH_VERIFY_TTL_MS: z.coerce.number().int().positive().default(900_000),
    AUTH_OTP_COOLDOWN_MS: z.coerce.number().int().positive().default(60_000),
    AUTH_OTP_EMAIL_LIMIT: z.coerce.number().int().positive().default(5),
    AUTH_OTP_IP_LIMIT: z.coerce.number().int().positive().default(20),
    AUTH_OTP_DEVICE_LIMIT: z.coerce.number().int().positive().default(10),
    AUTH_OTP_TTL_MS: z.coerce.number().int().positive().default(3_600_000),
    AUTH_REFRESH_TOKEN_LIMIT: z.coerce.number().int().positive().default(30),
    AUTH_REFRESH_IP_LIMIT: z.coerce.number().int().positive().default(60),
    AUTH_REFRESH_DEVICE_LIMIT: z.coerce.number().int().positive().default(30),
    AUTH_REFRESH_TTL_MS: z.coerce.number().int().positive().default(300_000),
    TICKET_CREATE_RATE_LIMIT: z.coerce.number().int().positive().default(10),
    TICKET_COMMENT_RATE_LIMIT: z.coerce.number().int().positive().default(60),
    TICKET_ATTACHMENT_RATE_LIMIT: z.coerce.number().int().positive().default(30),
    TICKET_WRITE_RATE_TTL_MS: z.coerce.number().int().positive().default(3_600_000),
    TRUST_WRITE_RATE_LIMIT: z.coerce.number().int().positive().default(10),
    TRUST_WRITE_RATE_TTL_MS: z.coerce.number().int().positive().default(60_000),
    TICKET_COMMENT_HARD_CAP: z.coerce.number().int().positive().default(500),
    TICKET_ATTACHMENT_HARD_CAP: z.coerce.number().int().positive().default(50),
    OCR_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.8),
    OCR_CREATE_RATE_LIMIT: z.coerce.number().int().positive().default(30),
    OCR_RATE_TTL_MS: z.coerce.number().int().positive().default(3_600_000),
    OCR_UPLOAD_MAX_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .max(20 * 1024 * 1024)
      .default(5 * 1024 * 1024),
    PRISMA_QUERY_LOG: z
      .enum(['0', '1'])
      .default('0')
      .transform((value) => value === '1'),
    SLOW_REQUEST_MS: z.coerce.number().nonnegative().default(1_000),
    TRACKING_ACCESS_CACHE_TTL_MS: z.coerce.number().nonnegative().default(15_000),
    PAYOS_CLIENT_ID: z.string(),
    PAYOS_API_KEY: z.string(),
    PAYOS_CHECKSUM_KEY: z.string(),
    PAYOS_RETURN_URL: z.string().url().default('http://localhost:3000/payments/payos/return'),
    PAYOS_CANCEL_URL: z.string().url().default('http://localhost:3000/payments/payos/cancel'),
    PAYOS_QR_EXPIRE_MINUTES: z.coerce.number().int().positive().default(15),
    PAYOS_SUBSCRIPTION_RETURN_URL: z.string().url().default('http://localhost:3000/subscriptions/payos/return'),
    PAYOS_SUBSCRIPTION_CANCEL_URL: z.string().url().default('http://localhost:3000/subscriptions/payos/cancel'),
    PAYOS_SUBSCRIPTION_EXPIRE_MINUTES: z.coerce.number().int().positive().default(15),
    PAYMENT_WEBHOOK_LOG_HMAC_SECRET: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(32).default('development-only-webhook-log-secret'),
    ),
    PAYMENT_WEBHOOK_LOG_DIGEST_VERSION: z.coerce.number().int().positive().default(1),
    PAYMENT_WEBHOOK_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
    PAYMENT_WEBHOOK_RETENTION_BATCH_SIZE: z.coerce.number().int().positive().max(10_000).default(1_000),
    GOOGLE_APPLICATION_CREDENTIALS: z.string().default('./src/secrets/firebase-service-account.json'),
    TEST_ACCOUNT_EMAILS: z.string().default(''),
  })
  .superRefine((config, ctx) => {
    const origins = config.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
    if (config.NODE_ENV === 'production' && origins.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['CORS_ORIGINS'], message: 'CORS_ORIGINS is required in production' })
    }
    if (
      config.NODE_ENV === 'production' &&
      config.PAYMENT_WEBHOOK_LOG_HMAC_SECRET === 'development-only-webhook-log-secret'
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['PAYMENT_WEBHOOK_LOG_HMAC_SECRET'],
        message: 'A dedicated webhook log HMAC secret is required in production',
      })
    }
    for (const origin of origins) {
      if (origin === '*') {
        ctx.addIssue({ code: 'custom', path: ['CORS_ORIGINS'], message: 'Wildcard CORS origin is not allowed' })
        continue
      }
      try {
        const url = new URL(origin)
        if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
          throw new Error('invalid origin')
        }
      } catch {
        ctx.addIssue({ code: 'custom', path: ['CORS_ORIGINS'], message: `Invalid CORS origin: ${origin}` })
      }
    }
  })

const configServer = ConfigSchema.safeParse(process.env)
if (!configServer.success) {
  logger.error('Các giá trị env không hợp lệ')
  logger.error(configServer.error.message)
  process.exit(1)
}
const envConfig = configServer.data
export default envConfig
