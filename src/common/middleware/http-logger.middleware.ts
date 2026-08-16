import { Logger } from '@nestjs/common'
import type { Request, Response, NextFunction } from 'express'

const logger = new Logger('HTTP')

/**
 * Middleware ghi log thông tin các request HTTP đi vào hệ thống và thời gian xử lý phản hồi.
 * Sử dụng như functional middleware để có thể catch được cả các request 404 không khớp route.
 * @param request Request từ express
 * @param response Response từ express
 * @param next Hàm next callback
 */
export function httpLoggerMiddleware(request: Request, response: Response, next: NextFunction): void {
  const { method, originalUrl } = request
  const startTime = Date.now()

  response.on('finish', () => {
    const { statusCode } = response
    const delay = Date.now() - startTime
    const logMessage = `[${method}] ${originalUrl} ${statusCode} - ${delay}ms`

    if (statusCode >= 500) {
      logger.error(logMessage)
    } else if (statusCode >= 400) {
      logger.warn(logMessage)
    } else {
      logger.log(logMessage)
    }
  })

  next()
}
