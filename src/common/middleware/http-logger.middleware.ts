import { Injectable, Logger, NestMiddleware } from '@nestjs/common'
import type { Request, Response, NextFunction } from 'express'

/**
 * Middleware ghi log thông tin các request HTTP đi vào hệ thống và thời gian xử lý phản hồi
 */
@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP')

  /**
   * Xử lý middleware ghi log thông tin phương thức, đường dẫn, status code và độ trễ (ms) của request
   * @param request Request từ express
   * @param response Response từ express
   * @param next Hàm next callback
   */
  use(request: Request, response: Response, next: NextFunction): void {
    const { method, originalUrl } = request
    const startTime = Date.now()

    response.on('finish', () => {
      const { statusCode } = response
      const delay = Date.now() - startTime
      const logMessage = `[${method}] ${originalUrl} ${statusCode} - ${delay}ms`

      if (statusCode >= 500) {
        this.logger.error(logMessage)
      } else if (statusCode >= 400) {
        this.logger.warn(logMessage)
      } else {
        this.logger.log(logMessage)
      }
    })

    next()
  }
}
