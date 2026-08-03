import { Prisma } from 'generated/prisma/client'

import envConfig from '@src/config/env.config'

export function resolvePrismaLogLevels(): Prisma.LogLevel[] {
  if (envConfig.NODE_ENV === 'production') {
    return ['warn', 'error']
  }

  return envConfig.PRISMA_QUERY_LOG ? ['query', 'warn', 'error'] : ['warn', 'error']
}
