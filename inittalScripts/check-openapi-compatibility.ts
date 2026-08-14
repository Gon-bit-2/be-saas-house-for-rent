import fs from 'node:fs'
import path from 'node:path'

type JsonObject = Record<string, unknown>

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head']
const baseFlag = process.argv.indexOf('--base')
const basePath = baseFlag >= 0 ? process.argv[baseFlag + 1] : undefined
if (!basePath) {
  console.error('Usage: npm run contract:compat -- --base <baseline-openapi.json>')
  process.exit(1)
}

const currentPath = path.resolve('docs/api/openapi.json')
const baseline = JSON.parse(fs.readFileSync(path.resolve(basePath), 'utf8')) as JsonObject
const current = JSON.parse(fs.readFileSync(currentPath, 'utf8')) as JsonObject
const errors: string[] = []

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonObject) : {}
}

function resolvePointer(document: JsonObject, pointer: string): unknown {
  if (!pointer.startsWith('#/')) return undefined
  return pointer
    .slice(2)
    .split('/')
    .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'))
    .reduce<unknown>((value, part) => object(value)[part], document)
}

function normalizeSchema(value: unknown, document: JsonObject, refs = new Set<string>()): unknown {
  if (Array.isArray(value)) return value.map((item) => normalizeSchema(item, document, refs))
  if (!value || typeof value !== 'object') return value
  const source = value as JsonObject
  if (typeof source.$ref === 'string') {
    if (refs.has(source.$ref)) return { $ref: source.$ref }
    const target = resolvePointer(document, source.$ref)
    if (target === undefined) return { $ref: source.$ref }
    const nextRefs = new Set(refs)
    nextRefs.add(source.$ref)
    return normalizeSchema(target, document, nextRefs)
  }

  const ignored = new Set(['description', 'example', 'examples', 'title'])
  return Object.fromEntries(
    Object.entries(source)
      .filter(([key]) => !ignored.has(key))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, normalizeSchema(nested, document, refs)]),
  )
}

function isResponseSchemaCompatible(before: unknown, after: unknown): boolean {
  if (Object.is(before, after)) return true
  if (Array.isArray(before) || Array.isArray(after)) {
    if (!Array.isArray(before) || !Array.isArray(after) || before.length !== after.length) return false
    return before.every((item, index) => isResponseSchemaCompatible(item, after[index]))
  }
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object') return false

  const beforeObject = before as JsonObject
  const afterObject = after as JsonObject
  const structuralKeys = new Set(['properties', 'required'])
  const beforeKeys = Object.keys(beforeObject).filter((key) => !structuralKeys.has(key))
  const afterKeys = Object.keys(afterObject).filter((key) => !structuralKeys.has(key))
  if (beforeKeys.length !== afterKeys.length || beforeKeys.some((key) => !afterKeys.includes(key))) return false
  if (beforeKeys.some((key) => !isResponseSchemaCompatible(beforeObject[key], afterObject[key]))) return false

  const beforeProperties = object(beforeObject.properties)
  const afterProperties = object(afterObject.properties)
  if (
    Object.entries(beforeProperties).some(
      ([key, schema]) => !(key in afterProperties) || !isResponseSchemaCompatible(schema, afterProperties[key]),
    )
  ) {
    return false
  }

  const beforeRequired = Array.isArray(beforeObject.required) ? beforeObject.required : []
  const afterRequired = new Set(Array.isArray(afterObject.required) ? afterObject.required : [])
  return beforeRequired.every((key) => afterRequired.has(key))
}

function successSchemas(operation: JsonObject) {
  const responses = object(operation.responses)
  return Object.entries(responses)
    .filter(([status]) => /^2\d\d$/.test(status))
    .map(([status, response]) => {
      const content = object(object(response).content)
      return [status, object(content['application/json']).schema] as const
    })
}

const baselinePaths = object(baseline.paths)
const currentPaths = object(current.paths)
for (const [url, baselinePathValue] of Object.entries(baselinePaths)) {
  const currentPathValue = currentPaths[url]
  if (!currentPathValue) {
    errors.push(`Removed URL: ${url}`)
    continue
  }
  const baselinePath = object(baselinePathValue)
  const currentPathItem = object(currentPathValue)
  for (const method of METHODS) {
    if (!baselinePath[method]) continue
    if (!currentPathItem[method]) {
      errors.push(`Removed operation: ${method.toUpperCase()} ${url}`)
      continue
    }
    const currentByStatus = new Map(successSchemas(object(currentPathItem[method])))
    for (const [status, baselineSchema] of successSchemas(object(baselinePath[method]))) {
      if (!currentByStatus.has(status)) {
        errors.push(`Removed ${status} response: ${method.toUpperCase()} ${url}`)
        continue
      }
      const before = normalizeSchema(baselineSchema, baseline)
      const after = normalizeSchema(currentByStatus.get(status), current)
      if (!isResponseSchemaCompatible(before, after)) {
        errors.push(`Changed ${status} response schema: ${method.toUpperCase()} ${url}`)
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`OpenAPI compatibility check failed (${errors.length} breaking change(s)):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('OpenAPI compatibility check passed: no baseline URL or success-response schema was removed/changed.')
