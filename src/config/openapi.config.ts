import type { INestApplication } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { cleanupOpenApiDoc } from 'nestjs-zod'
import type { OpenAPIObject } from '@nestjs/swagger'
import { addFePrioritySchemas, feSuccessResponseSchema, isFePriorityOperation } from './openapi-contract.config'

type PathItemObject = OpenAPIObject['paths'][string]
type OperationObject = NonNullable<PathItemObject['get']>
type ReferenceObject = { $ref: string }
type ResponseObject = Exclude<OperationObject['responses'][string], ReferenceObject | undefined>
const PUBLIC_OPERATIONS = new Set([
  'GET /',
  'POST /auth/register',
  'POST /auth/login',
  'POST /auth/send-otp',
  'POST /auth/refresh-token',
  'POST /auth/forgot-password',
  'GET /auth/google/url',
  'GET /auth/google/callback',
  'POST /auth/google/session',
  'GET /marketplace/rooms',
  'GET /marketplace/rooms/{id}',
  'GET /marketplace/rooms/{roomId}/reviews',
  'GET /marketplace/rooms/{roomId}/review-summary',
  'POST /payment-webhooks/payos',
])

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const
const COMMON_ERRORS = ['400', '401', '403', '404', '409', '429', '500'] as const
const TENANT_CONTEXT_OPERATIONS = [
  /^(GET|POST|PATCH|DELETE) \/properties(?:\/|$)/,
  /^(GET|POST|PATCH|DELETE) \/rooms(?:\/|$)/,
  /^(GET|PATCH) \/rental-requests(?:$|\/\{id\})/,
  /^(GET|PATCH) \/room-viewing-appointments(?:$|\/\{id\})/,
  /^(GET|POST|PATCH) \/contracts(?:$|\/\{id\})/,
  /^(GET|POST|PATCH) \/invoices(?:$|\/debts$|\/\{id\})/,
  /^(GET|PATCH) \/payments(?:$|\/\{id\})/,
  /^GET \/tickets$/,
  /^GET \/tickets\/\{id\}(?:\/comments|\/attachments|\/history)?$/,
  /^PATCH \/tickets\/\{id\}(?:\/status|\/assign|\/close)$/,
] as const

const successSchema = {
  type: 'object',
  additionalProperties: true,
  description: 'Endpoint-specific response. See controller response DTO and examples.',
}

export function enrichOpenApiDocument(document: OpenAPIObject): OpenAPIObject {
  const components = (document.components ??= {})
  addFePrioritySchemas(document)
  components.schemas = {
    ...components.schemas,
    ApiErrorResponse: {
      type: 'object',
      required: ['statusCode', 'code', 'message', 'timestamp', 'path', 'requestId'],
      additionalProperties: false,
      properties: {
        statusCode: { type: 'integer', example: 400 },
        code: { type: 'string', example: 'BAD_REQUEST' },
        message: { type: 'string', example: 'Request validation failed' },
        details: {
          description: 'Optional structured validation or domain error details',
          oneOf: [
            { type: 'object', additionalProperties: true },
            { type: 'array', items: {} },
            { type: 'string' },
            { type: 'number' },
            { type: 'boolean' },
            { type: 'null' },
          ],
        },
        timestamp: { type: 'string', format: 'date-time' },
        path: { type: 'string', example: '/rooms?page=0' },
        requestId: { type: 'string', example: '9f5b7890-4be7-43ad-a347-359e9146600d' },
      },
    },
  }
  components.responses = {
    ...components.responses,
    BadRequest: errorResponse('Bad request or validation failure'),
    Unauthorized: errorResponse('Authentication is required or the token is invalid'),
    Forbidden: errorResponse('The current principal is not allowed to perform this operation'),
    NotFound: errorResponse('The resource does not exist in the caller scope'),
    Conflict: errorResponse('The request conflicts with current resource state'),
    RateLimited: errorResponse('The configured request limit has been exceeded', true),
    InternalError: errorResponse('Unexpected server error'),
  }

  for (const [path, pathItem] of Object.entries(document.paths)) {
    addOperationContracts(path, pathItem)
  }
  return document
}

function errorResponse(description: string, rateLimited = false): ResponseObject {
  return {
    description,
    ...(rateLimited
      ? {
          headers: {
            'Retry-After': {
              description: 'Seconds until the caller may retry',
              schema: { type: 'integer', minimum: 1 },
            },
          },
        }
      : {}),
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorResponse' },
      },
    },
  }
}

function addOperationContracts(path: string, pathItem: PathItemObject) {
  for (const method of HTTP_METHODS) {
    const operation = pathItem[method]
    if (!operation) continue

    const key = `${method.toUpperCase()} ${path}`
    operation.security = PUBLIC_OPERATIONS.has(key) ? [] : [{ bearerAuth: [] }]
    operation.responses ??= {}
    for (const code of COMMON_ERRORS) {
      if (TENANT_CONTEXT_OPERATIONS.some((pattern) => pattern.test(key))) {
        operation.parameters ??= []
        if (!operation.parameters.some((parameter) => !('$ref' in parameter) && parameter.name === 'x-tenant-id')) {
          operation.parameters.push({
            name: 'x-tenant-id',
            in: 'header',
            required: true,
            description: 'Active tenant ID selected from the authenticated profile memberships',
            schema: { type: 'integer', minimum: 1 },
          })
        }
      }
      if (operation.responses[code]) continue
      operation.responses[code] = errorReference(code)
    }
    for (const [code, response] of Object.entries(operation.responses)) {
      if (!response || code === '204' || '$ref' in response || !code.startsWith('2')) continue
      if (isFePriorityOperation(path)) {
        response.content = { 'application/json': { schema: feSuccessResponseSchema(method, path) } }
      } else if (!response.content) {
        response.content = { 'application/json': { schema: successSchema } }
      }
    }
  }
}

function errorReference(code: string): ReferenceObject {
  const names: Record<string, string> = {
    '400': 'BadRequest',
    '401': 'Unauthorized',
    '403': 'Forbidden',
    '404': 'NotFound',
    '409': 'Conflict',
    '429': 'RateLimited',
    '500': 'InternalError',
  }
  return { $ref: `#/components/responses/${names[code]}` }
}

export function configureOpenApi(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('SaaS House Rental Web MVP API')
    .setDescription(
      'Interactive contract for Super Admin, landlord/staff and renter Web MVP flows. Existing route URLs are kept stable.',
    )
    .setVersion('1.0.0')
    .addServer('http://localhost:1174', 'Local development')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token returned by auth login/session APIs',
      },
      'bearerAuth',
    )
    .build()
  const generated = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey, methodKey) => `${controllerKey}_${methodKey}`,
  })
  const document = enrichOpenApiDocument(cleanupOpenApiDoc(generated, { version: '3.1' }))
  document.openapi = '3.1.0'
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: { persistAuthorization: true, displayRequestDuration: true },
  })
  return document
}
