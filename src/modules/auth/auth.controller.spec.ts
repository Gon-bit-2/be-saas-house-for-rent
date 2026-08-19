import type { Response } from 'express'

jest.mock('./auth.service', () => ({ AuthService: class AuthService {} }))
import { AuthController } from './auth.controller'

describe('AuthController Google OAuth2', () => {
  let controller: AuthController
  let authService: Record<string, jest.Mock>

  beforeEach(() => {
    authService = {
      getGoogleAuthorizationUrl: jest.fn().mockReturnValue({ url: 'https://accounts.google.com/o/oauth2/v2/auth' }),
      handleGoogleCallback: jest.fn().mockResolvedValue('http://localhost:5173/oauth/google?sessionToken=session-id'),
      googleSession: jest.fn().mockResolvedValue({ accessToken: 'access-token', refreshToken: 'refresh-token' }),
    }
    controller = new AuthController(authService as never)
  })

  it('does not expose an OTP verification action that can consume a code early', () => {
    expect('verifyOTP' in controller).toBe(false)
  })

  it('delegates Google authorization URL creation to AuthService', () => {
    const result = controller.getGoogleAuthorizationUrl({ client: 'web' }, '127.0.0.1', 'jest-agent')

    expect(result).toEqual({ url: 'https://accounts.google.com/o/oauth2/v2/auth' })
    expect(authService.getGoogleAuthorizationUrl).toHaveBeenCalledWith('web', '127.0.0.1', 'jest-agent')
  })

  it('redirects Google callback to client redirect URL returned by AuthService', async () => {
    const redirect = jest.fn()
    const response = {
      redirect,
    } as unknown as Response

    await controller.googleCallback('code', 'state', undefined, '127.0.0.1', 'jest-agent', response)

    expect(authService.handleGoogleCallback).toHaveBeenCalledWith(
      { code: 'code', state: 'state', error: undefined },
      '127.0.0.1',
      'jest-agent',
    )
    expect(redirect).toHaveBeenCalledWith('http://localhost:5173/oauth/google?sessionToken=session-id')
  })

  it('delegates Google session exchange to AuthService', async () => {
    const result = await controller.googleSession(
      { sessionToken: '550e8400-e29b-41d4-a716-446655440000' },
      '127.0.0.1',
      'jest-agent',
    )

    expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' })
    expect(authService.googleSession).toHaveBeenCalledWith(
      { sessionToken: '550e8400-e29b-41d4-a716-446655440000' },
      '127.0.0.1',
      'jest-agent',
    )
  })
})
