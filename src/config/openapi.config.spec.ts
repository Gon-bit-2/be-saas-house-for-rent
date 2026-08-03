import type { OpenAPIObject } from '@nestjs/swagger'
import { enrichOpenApiDocument } from './openapi.config'

describe('enrichOpenApiDocument', () => {
  it('adds FE error contracts and marks public/protected operations', () => {
    const document = {
      openapi: '3.0.0',
      info: { title: 'test', version: '1' },
      paths: {
        '/marketplace/rooms': {
          get: { responses: { 200: { description: 'ok' } } },
        },
        '/rooms': {
          get: { responses: { 200: { description: 'ok' } } },
        },
      },
      components: { schemas: {} },
    } as OpenAPIObject

    const result = enrichOpenApiDocument(document)
    const publicOperation = result.paths['/marketplace/rooms']?.get
    const protectedOperation = result.paths['/rooms']?.get

    expect(publicOperation?.security).toEqual([])
    expect(protectedOperation?.security).toEqual([{ bearerAuth: [] }])
    expect(protectedOperation?.responses['400']).toEqual({
      $ref: '#/components/responses/BadRequest',
    })
    expect(protectedOperation?.responses['500']).toEqual({
      $ref: '#/components/responses/InternalError',
    })
    expect(result.components.schemas?.ApiErrorResponse).toBeDefined()
    expect(result.components.responses?.Unauthorized).toBeDefined()
    expect(protectedOperation?.responses['200']).toEqual(
      expect.objectContaining({
        content: expect.objectContaining({ 'application/json': expect.any(Object) }),
      }),
    )
  })
})
