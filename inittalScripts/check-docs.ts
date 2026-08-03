import { NestFactory } from '@nestjs/core'
import type { OpenAPIObject } from '@nestjs/swagger'
import { readFile, stat } from 'node:fs/promises'
import { dirname, extname, resolve } from 'node:path'
import { AppModule } from '../src/app.module'
import { configureOpenApi } from '../src/config/openapi.config'

const ROOT = process.cwd()
const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'])
const SPEC_NAMES = [
  'G01_xac_thuc_tai_khoan_phan_quyen.md',
  'G02_quan_tri_saas_tenant_goi_dich_vu.md',
  'G03_nha_tro_tang_phong_tien_ich.md',
  'G04_marketplace_yeu_cau_thue_lich_xem_phong.md',
  'G05_nguoi_thue_hop_dong_lich_su_thue_ban_giao.md',
  'G06_dien_nuoc_cong_to_chi_so_dich_vu.md',
  'G07_hoa_don_cong_no.md',
  'G08_thanh_toan_qr_doi_soat_webhook.md',
  'G09_ticket_su_co_bao_tri.md',
  'G10_thong_bao_realtime_push_notification.md',
  'G11_dashboard_bao_cao_audit_cau_hinh_he_thong.md',
  'G12_danh_gia_uy_tin_bao_cao_vi_pham.md',
]
const DOC_FILES = [
  'README.md',
  'docs/README.md',
  'docs/api/API_REFERENCE.md',
  'docs/api/API_RUNTIME_INDEX.md',
  'docs/api/G05_HANDOVER_TERMINATION.md',
  'docs/api/OCR.md',
  'docs/db/db.md',
  'docs/task/task.md',
  'docs/systems/Bao_cao_danh_gia_tien_do_va_an_toan.md',
  'docs/systems/Mo_ta_kien_truc_he_thong_MVP.md',
  'docs/systems/SEC_M01_M05_trien_khai.md',
  'docs/systems/Tai_lieu_yeu_cau_chuc_nang_MVP.md',
  'docs/systems/ad.md',
  'docs/systems/tai_lieu_phan_tich_nghiep_vu_he_thong.md',
  ...SPEC_NAMES.map((name) => `docs/specs/${name}`),
]

function openApiOperations(document: OpenAPIObject) {
  const result = new Set<string>()
  for (const [path, item] of Object.entries(document.paths)) {
    for (const method of Object.keys(item))
      if (METHODS.has(method.toUpperCase())) result.add(`${method.toUpperCase()} ${path}`)
  }
  return result
}

function runtimeOperations(markdown: string) {
  const result = new Set<string>()
  for (const match of markdown.matchAll(/^\|\s*(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*\|\s*`([^`]+)`\s*\|/gm))
    result.add(`${match[1]} ${match[2]}`)
  return result
}

function referenceOperations(markdown: string) {
  const result = new Set<string>()
  for (const match of markdown.matchAll(/^###\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+`([^`]+)`/gm))
    result.add(`${match[1]} ${match[2]}`)
  return result
}

function compare(name: string, expected: Set<string>, actual: Set<string>, errors: string[]) {
  const missing = [...expected].filter((item) => !actual.has(item))
  const extra = [...actual].filter((item) => !expected.has(item))
  if (missing.length || extra.length) errors.push(`${name}: thiếu [${missing.join(', ')}], thừa [${extra.join(', ')}]`)
}

function tables(schema: string) {
  const result: string[] = []
  for (const match of schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm))
    result.push(match[2].match(/@@map\("([^"]+)"\)/)?.[1] ?? match[1])
  return result
}

async function links(file: string, markdown: string, errors: string[]) {
  const text = markdown.replace(/```[\s\S]*?```/g, '')
  for (const match of text.matchAll(/!?\[[^\]]*]\(([^)]+)\)/g)) {
    const target = match[1].trim().replace(/^<|>$/g, '')
    if (!target || /^(https?:|mailto:|tel:)/i.test(target) || target.startsWith('#')) continue
    const relative = decodeURIComponent(target.split('#')[0])
    if (!relative || /^[A-Za-z]:[\\/]/.test(relative) || relative.startsWith('/')) continue
    try {
      await stat(resolve(ROOT, dirname(file), relative))
    } catch {
      errors.push(`${file}: liên kết không tồn tại: ${target}`)
    }
  }
}

async function bootstrap() {
  const errors: string[] = []
  const docs = new Map<string, string>()
  for (const file of DOC_FILES) {
    try {
      const content = await readFile(resolve(ROOT, file), 'utf8')
      docs.set(file, content)
      if (extname(file) === '.md') await links(file, content, errors)
    } catch {
      errors.push(`Thiếu tài liệu bắt buộc: ${file}`)
    }
  }

  const exported = JSON.parse(await readFile(resolve(ROOT, 'docs/api/openapi.json'), 'utf8')) as OpenAPIObject
  const expected = openApiOperations(exported)
  const app = await NestFactory.create(AppModule, { logger: false })
  try {
    compare('openapi.json so với runtime', openApiOperations(configureOpenApi(app)), expected, errors)
  } finally {
    await app.close()
  }
  compare('API_RUNTIME_INDEX.md', expected, runtimeOperations(docs.get('docs/api/API_RUNTIME_INDEX.md') ?? ''), errors)
  compare('API_REFERENCE.md', expected, referenceOperations(docs.get('docs/api/API_REFERENCE.md') ?? ''), errors)

  const schema = await readFile(resolve(ROOT, 'prisma/schema.prisma'), 'utf8')
  const db = docs.get('docs/db/db.md') ?? ''
  for (const table of tables(schema))
    if (!db.includes(`\`${table}\``)) errors.push(`docs/db/db.md thiếu bảng Prisma: ${table}`)

  const all = [...docs.values()].join('\n')
  const secrets: Array<[string, RegExp]> = [
    ['private key', /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/],
    ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
    ['Google API key', /\bAIza[0-9A-Za-z_-]{30,}\b/],
    ['Stripe live secret', /\bsk_live_[0-9A-Za-z]{16,}\b/],
    ['JWT thực', /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/],
  ]
  for (const [name, pattern] of secrets)
    if (pattern.test(all)) errors.push(`Phát hiện mẫu secret (${name}) trong tài liệu`)

  if (errors.length) {
    console.error(`Documentation check failed (${errors.length} lỗi):`)
    for (const error of errors) console.error(`- ${error}`)
    process.exitCode = 1
    return
  }
  console.log(
    `Documentation check passed: ${DOC_FILES.length} Markdown files, ${expected.size} API operations, ${tables(schema).length} Prisma tables.`,
  )
}

void bootstrap()
