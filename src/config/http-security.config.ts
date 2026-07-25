export function buildCorsOptions(originsValue: string) {
  const origins = new Set(
    originsValue
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  )
  return {
    origin: (origin: string | undefined, callback: (error: Error | null, allowed?: boolean) => void) =>
      callback(null, !origin || origins.has(origin)),
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Tenant-Id'],
    exposedHeaders: ['Retry-After'],
    credentials: false,
    maxAge: 600,
  }
}

export function buildHelmetOptions(nodeEnv?: string) {
  return {
    strictTransportSecurity:
      nodeEnv === 'production' ? { maxAge: 31_536_000, includeSubDomains: true, preload: false } : false,
  }
}
