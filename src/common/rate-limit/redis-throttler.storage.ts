import { ServiceUnavailableException, type OnApplicationShutdown } from '@nestjs/common'
import type { ThrottlerStorage } from '@nestjs/throttler'
import { createClient, type RedisClientType } from 'redis'
import envConfig from '@src/config/env.config'

const INCREMENT_SCRIPT = `
local blockTtl = redis.call('PTTL', KEYS[2])
if blockTtl > 0 then
  local hits = tonumber(redis.call('GET', KEYS[1]) or '0')
  local ttl = redis.call('PTTL', KEYS[1])
  return {hits, ttl, 1, blockTtl}
end

local hits = redis.call('INCR', KEYS[1])
if hits == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
if hits > tonumber(ARGV[2]) then
  redis.call('SET', KEYS[2], '1', 'PX', ARGV[3])
  return {hits, ttl, 1, tonumber(ARGV[3])}
end
return {hits, ttl, 0, 0}
`

export class RedisThrottlerStorage implements ThrottlerStorage, OnApplicationShutdown {
  private readonly client: RedisClientType
  private connectPromise?: Promise<unknown>

  constructor() {
    this.client = envConfig.REDIS_URL
      ? createClient({ url: envConfig.REDIS_URL })
      : createClient({
          username: envConfig.REDIS_USERNAME || undefined,
          password: envConfig.REDIS_PASSWORD || undefined,
          socket: {
            host: envConfig.REDIS_HOST,
            port: envConfig.REDIS_PORT,
          },
        })
    this.client.on('error', () => undefined)
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<{ totalHits: number; timeToExpire: number; isBlocked: boolean; timeToBlockExpire: number }> {
    try {
      await this.ensureConnected()
      const namespacedKey = `rate-limit:${throttlerName}:${key}`
      const result = (await this.client.eval(INCREMENT_SCRIPT, {
        keys: [namespacedKey, `${namespacedKey}:block`],
        arguments: [String(ttl), String(limit), String(blockDuration)],
      })) as number[]
      return {
        totalHits: Number(result[0]),
        timeToExpire: this.toSeconds(result[1]),
        isBlocked: Number(result[2]) === 1,
        timeToBlockExpire: this.toSeconds(result[3]),
      }
    } catch {
      throw new ServiceUnavailableException('RATE_LIMIT_STORAGE_UNAVAILABLE')
    }
  }

  private ensureConnected() {
    if (this.client.isReady) return Promise.resolve()
    this.connectPromise ??= this.client.connect().finally(() => {
      this.connectPromise = undefined
    })
    return this.connectPromise
  }

  private toSeconds(milliseconds: number) {
    return Math.max(0, Math.ceil(Number(milliseconds) / 1000))
  }

  async onApplicationShutdown() {
    if (this.client.isOpen) {
      await this.client.quit()
    }
  }
}

export const redisThrottlerStorage = new RedisThrottlerStorage()
