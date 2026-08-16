import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import type { Request, Response } from 'express'
import { randomUUID } from 'node:crypto'

export type ApiErrorResponse = {
  statusCode: number
  code: string
  message: string
  details?: unknown
  timestamp: string
  path: string
  requestId: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const statusCodeName = (status: number) => {
  const name = HttpStatus[status]
  return typeof name === 'string' ? name : `HTTP_${status}`
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name)

  /**
   * Bắt và xử lý tất cả các ngoại lệ (Exception) xảy ra trong ứng dụng API, ghi log chi tiết ra terminal và chuẩn hóa response gửi về client
   * @param exception Ngoại lệ được ném ra
   * @param host Context của arguments host (chứa request và response HTTP)
   */
  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp()
    const request = http.getRequest<Request>()
    const response = http.getResponse<Response>()
    if (response.headersSent) return

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
    const raw = exception instanceof HttpException ? exception.getResponse() : undefined
    const normalized = this.normalize(raw, status)
    const requestIdHeader = request.headers['x-request-id']
    const requestId =
      typeof requestIdHeader === 'string' && requestIdHeader.trim()
        ? requestIdHeader.trim().slice(0, 128)
        : randomUUID()

    const method = request.method
    const url = request.originalUrl || request.url
    const detailsStr = normalized.details ? ` | Details: ${JSON.stringify(normalized.details)}` : ''
    const logSummary = `[${method}] ${url} -> Status: ${status} (${normalized.code}) | Message: "${normalized.message}"${detailsStr} | request_id=${requestId}`

    if (status >= 500 || !(exception instanceof HttpException)) {
      const stack = exception instanceof Error ? exception.stack : String(exception)
      this.logger.error(logSummary, stack)
      // Log trực tiếp ra console để đảm bảo terminal luôn hiển thị chi tiết lỗi 500, tránh trường hợp config Logger của NestJS nuốt log
      console.error(exception)
    } else {
      this.logger.warn(logSummary)
    }

    const body: ApiErrorResponse = {
      statusCode: status,
      code: normalized.code,
      message: normalized.message,
      ...(normalized.details === undefined ? {} : { details: normalized.details }),
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
      requestId,
    }
    response.setHeader('x-request-id', requestId)
    response.status(status).json(body)
  }

  /**
   * Chuẩn hóa cấu trúc phản hồi lỗi dạng ApiErrorResponse từ các loại dữ liệu raw exception
   * @param raw Dữ liệu nhận được từ exception.getResponse()
   * @param status Mã HTTP Status Code
   * @returns Cấu trúc code, message, details đã được chuẩn hóa
   */
  private normalize(raw: string | object | undefined, status: number) {
    const fallbackCode = statusCodeName(status)
    const fallbackMessage = status === 500 ? 'Internal server error' : fallbackCode.replaceAll('_', ' ').toLowerCase()

    if (typeof raw === 'string') {
      return { code: fallbackCode, message: raw, details: undefined }
    }
    if (!isRecord(raw)) {
      return { code: fallbackCode, message: fallbackMessage, details: undefined }
    }

    const rawMessage = raw.message
    const message =
      typeof rawMessage === 'string'
        ? rawMessage
        : Array.isArray(rawMessage)
          ? 'Request validation failed'
          : fallbackMessage
    const code =
      typeof raw.code === 'string'
        ? raw.code
        : typeof raw.error === 'string'
          ? raw.error
              .trim()
              .replace(/[^a-zA-Z0-9]+/g, '_')
              .toUpperCase()
          : fallbackCode
    const details = raw.details ?? (Array.isArray(rawMessage) ? rawMessage : undefined)
    return { code, message, details }
  }
}
