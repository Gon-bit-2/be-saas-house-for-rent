import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import envConfig from '@src/config/env.config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from 'generated/prisma/client'
import { resolvePrismaLogLevels } from '@src/common/utils/prismaLog'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const pool = new Pool({
      connectionString: envConfig.DATABASE_URL,
      idleTimeoutMillis: envConfig.DB_POOL_IDLE_TIMEOUT_MS,
      max: envConfig.DB_POOL_MAX,
    })
    const adapter = new PrismaPg(pool)
    super({
      adapter,
      log: resolvePrismaLogLevels(),
    })
  }
  /**
   * Tự động kết nối tới cơ sở dữ liệu khi module được khởi tạo
   */
  async onModuleInit() {
    await this.$connect()
  }

  /**
   * Tự động ngắt kết nối với cơ sở dữ liệu khi module bị hủy (ví dụ khi dừng ứng dụng)
   * Đây là phương thức bắt buộc phải có để thỏa mãn interface OnModuleDestroy
   */
  async onModuleDestroy() {
    await this.$disconnect()
  }
}
