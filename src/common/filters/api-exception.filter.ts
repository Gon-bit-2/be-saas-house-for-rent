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

    if (!(exception instanceof HttpException)) {
      const stack = exception instanceof Error ? exception.stack : String(exception)
      this.logger.error(`request_id=${requestId} path=${request.originalUrl}`, stack)
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
