const { spawnSync } = require('node:child_process')

const databaseUrl = process.env.DATABASE_URL_E2E
if (!databaseUrl) {
  console.error('DATABASE_URL_E2E is required. Copy .env.e2e.example or set it explicitly.')
  process.exit(1)
}

let parsed
try {
  parsed = new URL(databaseUrl)
} catch {
  console.error('DATABASE_URL_E2E must be a valid PostgreSQL URL.')
  process.exit(1)
}

const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''))
const isLocalHost = ['127.0.0.1', 'localhost', 'postgres-e2e'].includes(parsed.hostname)
if (!isLocalHost || !databaseName.endsWith('_e2e')) {
  console.error('Refusing to reset database: host must be local and database name must end with _e2e.')
  process.exit(1)
}

const env = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: databaseUrl,
  REDIS_HOST: process.env.REDIS_HOST_E2E || process.env.REDIS_HOST || '127.0.0.1',
  REDIS_PORT: process.env.REDIS_PORT_E2E || process.env.REDIS_PORT || '56379',
}

function run(command, args) {
  const result = spawnSync(command, args, { env, stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.status !== 0) process.exit(result.status || 1)
}

run('npx', ['prisma', 'migrate', 'reset', '--force', '--schema', 'prisma/schema.prisma'])
run('npm', ['run', 'db:seed'])
run('npm', ['run', 'test:e2e', '--', '--runInBand', 'p0-acceptance.e2e-spec.ts'])
