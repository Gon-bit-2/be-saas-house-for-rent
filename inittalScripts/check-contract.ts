import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { FE_PRIORITY_PATH } from '../src/config/openapi-contract.config'

type JsonObject = Record<string, unknown>
type OpenApiOperation = {
  parameters?: Array<JsonObject>
  responses?: Record<string, JsonObject>
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const
const root = resolve(__dirname, '..', '..')
const openApiPath = resolve(root, 'docs', 'api', 'openapi.json')
const document = JSON.parse(readFileSync(openApiPath, 'utf8')) as {
  openapi: string
  info: { version: string }
  paths: Record<string, Record<string, OpenApiOperation>>
  components?: JsonObject
}

const failures: string[] = []
const operations: Array<{ method: string; path: string; operation: OpenApiOperation }> = []

for (const [path, pathItem] of Object.entries(document.paths)) {
  for (const method of HTTP_METHODS) {
    const operation = pathItem[method]
    if (operation) operations.push({ method, path, operation })
  }
}

if (!document.openapi.startsWith('3.')) failures.push('Expected OpenAPI 3.x, received ' + document.openapi)
if (document.info.version !== '1.0.0') failures.push('Expected implicit v1 contract, received ' + document.info.version)
if (operations.length !== 240) failures.push('Expected 240 operations, received ' + operations.length)

const priority = operations.filter(({ path }) => FE_PRIORITY_PATH.test(path))
if (priority.length !== 129) failures.push('Expected 129 FE-priority operations, received ' + priority.length)

for (const { method, path, operation } of priority) {
  const success = Object.entries(operation.responses ?? {}).find(([code]) => /^2\d\d$/.test(code))
  const response = success?.[1]
  const content = asObject(response?.content)
  const mediaType = asObject(content?.['application/json'])
  const schema = asObject(mediaType?.schema)
  const operationKey = method.toUpperCase() + ' ' + path
  if (!schema) {
    failures.push(operationKey + ' has no JSON success schema')
    continue
  }
  if (schema.additionalProperties === true) {
    failures.push(operationKey + ' still uses a generic additionalProperties response')
  }
  if (schema.type === 'object' && schema.additionalProperties !== false && !schema.$ref) {
    failures.push(operationKey + ' has an open top-level object response')
  }
}

const expectedTenantHeaders = [
  ['get', '/properties'],
  ['get', '/rooms'],
  ['get', '/rental-requests'],
  ['patch', '/rental-requests/{id}/decision'],
  ['get', '/room-viewing-appointments/{id}'],
  ['get', '/renters/invitations/{id}'],
  ['get', '/dashboard/action-center'],
  ['get', '/contracts'],
  ['get', '/invoices'],
  ['get', '/payments'],
  ['get', '/tickets'],
] as const
for (const [method, path] of expectedTenantHeaders) {
  const operation = document.paths[path]?.[method]
  const header = operation?.parameters?.find((parameter) => parameter.name === 'x-tenant-id')
  if (!header || header.required !== true || header.in !== 'header') {
    failures.push(method.toUpperCase() + ' ' + path + ' must require x-tenant-id')
  }
}

const forbiddenTenantHeaders = [
  ['get', '/auth/profile'],
  ['get', '/marketplace/rooms'],
  ['get', '/rental-requests/me'],
  ['post', '/tickets'],
  ['get', '/notifications'],
] as const
for (const [method, path] of forbiddenTenantHeaders) {
  const operation = document.paths[path]?.[method]
  if (operation?.parameters?.some((parameter) => parameter.name === 'x-tenant-id')) {
    failures.push(method.toUpperCase() + ' ' + path + ' must not require x-tenant-id')
  }
}

const errorSchema = asObject(asObject(document.components?.schemas)?.ApiErrorResponse)
const errorRequired = Array.isArray(errorSchema?.required) ? errorSchema.required : []
for (const field of ['statusCode', 'code', 'message', 'timestamp', 'path', 'requestId']) {
  if (!errorRequired.includes(field)) failures.push('ApiErrorResponse must require ' + field)
}
if (errorSchema?.additionalProperties !== false) failures.push('ApiErrorResponse must be closed')

const rateLimited = asObject(asObject(document.components?.responses)?.RateLimited)
if (!asObject(asObject(rateLimited?.headers)?.['Retry-After'])) {
  failures.push('RateLimited response must document Retry-After')
}

walkRefs(document, '#', failures)

if (failures.length > 0) {
  console.error('Contract check failed with ' + failures.length + ' issue(s):')
  for (const failure of failures) console.error('- ' + failure)
  process.exitCode = 1
} else {
  console.log(
    'Contract check passed: ' +
      operations.length +
      ' operations, ' +
      priority.length +
      ' FE-priority responses, all refs resolved.',
  )
}

function asObject(value: unknown): JsonObject | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as JsonObject) : undefined
}

function walkRefs(value: unknown, location: string, errors: string[]) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkRefs(item, location + '/' + index, errors))
    return
  }
  const objectValue = asObject(value)
  if (!objectValue) return
  if (typeof objectValue.$ref === 'string' && objectValue.$ref.startsWith('#/')) {
    if (resolvePointer(document, objectValue.$ref) === undefined) {
      errors.push('Unresolved ref ' + objectValue.$ref + ' at ' + location)
    }
  }
  for (const [key, child] of Object.entries(objectValue)) {
    walkRefs(child, location + '/' + key, errors)
  }
}

function resolvePointer(value: unknown, pointer: string): unknown {
  return pointer
    .slice(2)
    .split('/')
    .map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce<unknown>((current, segment) => asObject(current)?.[segment], value)
}
