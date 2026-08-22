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
        '/room-viewing-appointments/{id}': {
          get: { responses: { 200: { description: 'ok' } } },
        },
        '/renters/invitations/{id}': {
          get: { responses: { 200: { description: 'ok' } } },
        },
        '/dashboard/action-center': {
          get: { responses: { 200: { description: 'ok' } } },
        },
        '/invoices/debts': {
          get: { responses: { 200: { description: 'ok' } } },
        },
        '/contracts/{id}': {
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
    expect(result.components!.schemas?.ApiErrorResponse).toBeDefined()
    expect(result.components!.responses?.Unauthorized).toBeDefined()
    expect(protectedOperation?.responses['200']).toEqual(
      expect.objectContaining({
        content: expect.objectContaining({ 'application/json': expect.any(Object) }),
      }),
    )

    const successSchema = (path: string) =>
      (result.paths[path]?.get?.responses['200'] as any).content['application/json'].schema
    expect(successSchema('/room-viewing-appointments/{id}')).toEqual({
      $ref: '#/components/schemas/AppointmentDetail',
    })
    expect(successSchema('/renters/invitations/{id}')).toEqual({
      $ref: '#/components/schemas/RenterInvitation',
    })
    expect(successSchema('/dashboard/action-center')).toEqual({
      $ref: '#/components/schemas/ActionCenterResponse',
    })
    expect(successSchema('/invoices/debts')).toEqual({
      $ref: '#/components/schemas/DebtListResponse',
    })

    for (const path of ['/room-viewing-appointments/{id}', '/renters/invitations/{id}', '/dashboard/action-center']) {
      expect(result.paths[path]?.get?.parameters).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: 'x-tenant-id', in: 'header', required: true })]),
      )
    }

    const schemas = result.components!.schemas as Record<string, any>
    expect(schemas.Contract.required).toContain('members')
    expect(schemas.Contract.properties.members.items).toEqual({ $ref: '#/components/schemas/ContractMember' })
    expect(schemas.AppointmentDetail.properties.room).toEqual({ $ref: '#/components/schemas/AppointmentRoom' })
    expect(schemas.RenterInvitation.properties).not.toHaveProperty('codeHash')
    expect(schemas.RenterInvitation.properties).not.toHaveProperty('attempts')
  })
})
