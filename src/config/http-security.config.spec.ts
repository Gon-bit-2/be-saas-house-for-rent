import { buildCorsOptions, buildHelmetOptions } from './http-security.config'

describe('HTTP security configuration', () => {
  it('allows exact configured origins and origin-less server requests', () => {
    const options = buildCorsOptions('https://app.example.com,http://localhost:5173')
    const callback = jest.fn()

    options.origin('https://app.example.com', callback)
    options.origin(undefined, callback)

    expect(callback).toHaveBeenNthCalledWith(1, null, true)
    expect(callback).toHaveBeenNthCalledWith(2, null, true)
  })

  it('allows any origin when wildcard * is configured', () => {
    const options = buildCorsOptions('*')
    const callback = jest.fn()

    options.origin('https://any-domain.com', callback)
    expect(callback).toHaveBeenCalledWith(null, true)
  })

  it('fails closed for origins outside the allowlist', () => {
    const options = buildCorsOptions('https://app.example.com')
    const callback = jest.fn()

    options.origin('https://evil.example.com', callback)

    expect(callback).toHaveBeenCalledWith(null, false)
    expect(options.credentials).toBe(false)
    expect(options.exposedHeaders).toContain('Retry-After')
  })

  it('enables HSTS only in production without preload', () => {
    expect(buildHelmetOptions('test').strictTransportSecurity).toBe(false)
    expect(buildHelmetOptions('production').strictTransportSecurity).toEqual({
      maxAge: 31_536_000,
      includeSubDomains: true,
      preload: false,
    })
  })
})
