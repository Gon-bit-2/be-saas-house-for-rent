import { BadRequestException, HttpStatus } from '@nestjs/common'
import type { ArgumentsHost } from '@nestjs/common'
import { ApiExceptionFilter } from './api-exception.filter'

const createHost = (headers: Record<string, string> = {}) => {
  const json = jest.fn()
  const status = jest.fn().mockReturnValue({ json })
  const setHeader = jest.fn()
  const request = { headers, originalUrl: '/rooms?page=0' }
  const response = { headersSent: false, setHeader, status }
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost
  return { host, json, status, setHeader }
}

describe('ApiExceptionFilter', () => {
  it('normalizes validation messages and preserves the request id', () => {
    const target = createHost({ 'x-request-id': 'fe-request-1' })
    const filter = new ApiExceptionFilter()

    filter.catch(
      new BadRequestException({
        error: 'Bad Request',
        message: ['page must be positive'],
      }),
      target.host,
    )

    expect(target.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
    expect(target.setHeader).toHaveBeenCalledWith('x-request-id', 'fe-request-1')
    expect(target.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        code: 'BAD_REQUEST',
        message: 'Request validation failed',
        details: ['page must be positive'],
        path: '/rooms?page=0',
        requestId: 'fe-request-1',
      }),
    )
  })

  it('hides unknown exception details behind a stable 500 response', () => {
    const target = createHost()
    const filter = new ApiExceptionFilter()

    filter.catch(new Error('database credential leaked'), target.host)

    expect(target.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
    expect(target.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        path: '/rooms?page=0',
      }),
    )
    expect(target.json.mock.calls[0][0]).not.toEqual(
      expect.objectContaining({
        details: expect.stringContaining('credential'),
      }),
    )
  })
})
