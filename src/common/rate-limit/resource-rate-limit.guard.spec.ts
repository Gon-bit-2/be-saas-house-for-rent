import { REQUEST_USER_KEY } from '@src/common/constants/auth.constant'
import { ThrottlerException } from '@nestjs/throttler'
import { ResourceRateLimitGuard } from './resource-rate-limit.guard'

describe('ResourceRateLimitGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() }
  const storage = { increment: jest.fn() }
  const setHeader = jest.fn()
  const request = { ip: '127.0.0.1', [REQUEST_USER_KEY]: { userId: 42 } }
  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({ setHeader }),
    }),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    reflector.getAllAndOverride.mockReturnValue('ticket-create')
  })

  it('uses a hashed authenticated-user bucket', async () => {
    storage.increment.mockResolvedValue({ isBlocked: false, timeToBlockExpire: 0 })
    const guard = new ResourceRateLimitGuard(reflector as never, storage as never)

    await expect(guard.canActivate(context as never)).resolves.toBe(true)
    expect(storage.increment).toHaveBeenCalledWith(
      expect.stringMatching(/^resource:ticket-create:[a-f0-9]{64}$/),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      'resource',
    )
  })

  it('supports the trust write profile', async () => {
    reflector.getAllAndOverride.mockReturnValue('trust-write')
    storage.increment.mockResolvedValue({ isBlocked: false, timeToBlockExpire: 0 })
    const guard = new ResourceRateLimitGuard(reflector as never, storage as never)

    await expect(guard.canActivate(context as never)).resolves.toBe(true)
    expect(storage.increment).toHaveBeenCalledWith(
      expect.stringMatching(/^resource:trust-write:[a-f0-9]{64}$/),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      'resource',
    )
  })
  it('returns Retry-After when the distributed bucket is blocked', async () => {
    storage.increment.mockResolvedValue({ isBlocked: true, timeToBlockExpire: 45 })
    const guard = new ResourceRateLimitGuard(reflector as never, storage as never)

    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(ThrottlerException)
    expect(setHeader).toHaveBeenCalledWith('Retry-After', 45)
  })
})
