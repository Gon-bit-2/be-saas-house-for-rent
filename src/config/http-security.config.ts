/**
 * Cấu hình các tùy chọn CORS cho NestJS Application
 * @param originsValue Chuỗi các origin được phép, phân tách bằng dấu phẩy
 */
export function buildCorsOptions(originsValue: string) {
  const origins = new Set(
    originsValue
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  )
  return {
    origin: (origin: string | undefined, callback: (error: Error | null, allowed?: boolean) => void) =>
      callback(null, !origin || origins.has('*') || origins.has(origin)),
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'Accept',
      'Accept-Language',
      'X-Tenant-Id',
      'X-Request-Id',
      'X-App-Version',
      'X-Platform',
      'X-Device-Model',
      'X-Api-Key',
    ],
    exposedHeaders: ['Retry-After'],
    credentials: false,
    maxAge: 600,
  }
}

/**
 * Cấu hình các tùy chọn bảo mật Helmet theo môi trường chạy
 * @param nodeEnv Tên môi trường (production, development, test, ...)
 */
export function buildHelmetOptions(nodeEnv?: string) {
  return {
    strictTransportSecurity:
      nodeEnv === 'production' ? { maxAge: 31_536_000, includeSubDomains: true, preload: false } : false,
  }
}
