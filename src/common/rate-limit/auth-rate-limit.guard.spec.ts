import { ThrottlerException } from '@nestjs/throttler'
import { AuthRateLimitGuard } from './auth-rate-limit.guard'

function contextFor(request: Record<string, unknown>, response: { setHeader: jest.Mock }) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
  } as never
}

describe('AuthRateLimitGuard', () => {
  it('uses hashed email/IP buckets and returns Retry-After when blocked', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue('otp') }
    const storage = {
      increment: jest
        .fn()
        .mockResolvedValueOnce({ totalHits: 2, timeToExpire: 60, isBlocked: true, timeToBlockExpire: 60 })
        .mockResolvedValue({ totalHits: 1, timeToExpire: 60, isBlocked: false, timeToBlockExpire: 0 }),
    }
    const response = { setHeader: jest.fn() }
    const guard = new AuthRateLimitGuard(reflector as never, storage as never)

    await expect(
      guard.canActivate(
        contextFor(
          {
            ip: '127.0.0.1',
            socket: {},
            headers: {},
            body: { email: 'USER@example.com' },
          },
          response,
        ),
      ),
    ).rejects.toBeInstanceOf(ThrottlerException)

    expect(storage.increment).toHaveBeenCalledTimes(4)
    expect(storage.increment).toHaveBeenNthCalledWith(
      1,
      expect.not.stringContaining('user@example.com'),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      'auth',
    )
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', 60)
  })
})
