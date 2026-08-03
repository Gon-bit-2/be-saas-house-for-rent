import type { INestApplication } from '@nestjs/common'
import { ModulesContainer, NestFactory } from '@nestjs/core'
import type { OpenAPIObject } from '@nestjs/swagger'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { AppModule } from '../src/app.module'
import { AUTH_TYPE_KEY, type AuthTypeDecoratorPayload } from '../src/common/decorators/decorators/auth.decorator'
import { ROLES_KEY } from '../src/common/decorators/decorators/roles.decorator'
import { AUTH_RATE_LIMIT_KEY } from '../src/common/rate-limit/auth-rate-limit.decorator'
import { RESOURCE_RATE_LIMIT_KEY } from '../src/common/rate-limit/resource-rate-limit.decorator'
import { configureOpenApi } from '../src/config/openapi.config'

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const
type Method = (typeof METHODS)[number]
type Operation = { method: string; path: string; operationId: string; access: string; responses: string }
type RouteMeta = { roles: string[]; auth: string[]; rate: string }

const GROUPS: Record<string, [string, string?]> = {
  root: ['Trạng thái dịch vụ'],
  amenities: ['Danh mục tiện ích', 'G03_nha_tro_tang_phong_tien_ich.md'],
  'asset-categories': ['Danh mục tài sản', 'G05_nguoi_thue_hop_dong_lich_su_thue_ban_giao.md'],
  auth: ['Xác thực và hồ sơ', 'G01_xac_thuc_tai_khoan_phan_quyen.md'],
  'contract-terminations': ['Thanh lý hợp đồng', 'G05_nguoi_thue_hop_dong_lich_su_thue_ban_giao.md'],
  contracts: ['Hợp đồng', 'G05_nguoi_thue_hop_dong_lich_su_thue_ban_giao.md'],
  dashboard: ['Dashboard', 'G11_dashboard_bao_cao_audit_cau_hinh_he_thong.md'],
  'device-tokens': ['Thiết bị nhận push', 'G10_thong_bao_realtime_push_notification.md'],
  handovers: ['Bàn giao phòng', 'G05_nguoi_thue_hop_dong_lich_su_thue_ban_giao.md'],
  invoices: ['Hóa đơn và công nợ', 'G07_hoa_don_cong_no.md'],
  marketplace: ['Marketplace và kiểm duyệt', 'G04_marketplace_yeu_cau_thue_lich_xem_phong.md'],
  'meter-readings': ['Chỉ số điện nước', 'G06_dien_nuoc_cong_to_chi_so_dich_vu.md'],
  notifications: ['Thông báo', 'G10_thong_bao_realtime_push_notification.md'],
  ocr: ['OCR công tơ', 'G06_dien_nuoc_cong_to_chi_so_dich_vu.md'],
  'payment-webhooks': ['Webhook thanh toán', 'G08_thanh_toan_qr_doi_soat_webhook.md'],
  payments: ['Thanh toán hóa đơn', 'G08_thanh_toan_qr_doi_soat_webhook.md'],
  plans: ['Gói dịch vụ', 'G02_quan_tri_saas_tenant_goi_dich_vu.md'],
  properties: ['Nhà trọ và tầng', 'G03_nha_tro_tang_phong_tien_ich.md'],
  'rental-requests': ['Yêu cầu thuê', 'G04_marketplace_yeu_cau_thue_lich_xem_phong.md'],
  renters: ['Người thuê và lời mời', 'G05_nguoi_thue_hop_dong_lich_su_thue_ban_giao.md'],
  reports: ['Báo cáo vi phạm', 'G12_danh_gia_uy_tin_bao_cao_vi_pham.md'],
  reviews: ['Đánh giá và uy tín', 'G12_danh_gia_uy_tin_bao_cao_vi_pham.md'],
  'room-assets': ['Tài sản trong phòng', 'G05_nguoi_thue_hop_dong_lich_su_thue_ban_giao.md'],
  'room-viewing-appointments': ['Lịch xem phòng', 'G04_marketplace_yeu_cau_thue_lich_xem_phong.md'],
  rooms: ['Phòng, tiện ích và ảnh', 'G03_nha_tro_tang_phong_tien_ich.md'],
  'service-assignments': ['Gán dịch vụ', 'G06_dien_nuoc_cong_to_chi_so_dich_vu.md'],
  'service-catalog': ['Danh mục dịch vụ', 'G06_dien_nuoc_cong_to_chi_so_dich_vu.md'],
  'subscription-payments': ['Thanh toán gói SaaS', 'G02_quan_tri_saas_tenant_goi_dich_vu.md'],
  subscriptions: ['Subscription hiện hành', 'G02_quan_tri_saas_tenant_goi_dich_vu.md'],
  tenants: ['Đơn vị chủ trọ', 'G02_quan_tri_saas_tenant_goi_dich_vu.md'],
  tickets: ['Ticket sự cố', 'G09_ticket_su_co_bao_tri.md'],
  users: ['Người dùng và chủ trọ', 'G01_xac_thuc_tai_khoan_phan_quyen.md'],
  'utility-meters': ['Đồng hồ điện nước', 'G06_dien_nuoc_cong_to_chi_so_dich_vu.md'],
}

function operations(document: OpenAPIObject): Operation[] {
  return Object.entries(document.paths).flatMap(([path, item]) =>
    METHODS.flatMap((method) => {
      const operation = item[method]
      return operation
        ? [
            {
              method: method.toUpperCase(),
              path,
              operationId: operation.operationId ?? '-',
              access: operation.security?.length === 0 ? 'Công khai' : 'Bearer JWT',
              responses: Object.keys(operation.responses ?? {})
                .sort()
                .join(', '),
            },
          ]
        : []
    }),
  )
}

function routeMetadata(app: INestApplication): Map<string, RouteMeta> {
  const result = new Map<string, RouteMeta>()
  for (const moduleRef of app.get(ModulesContainer).values()) {
    for (const wrapper of moduleRef.controllers.values()) {
      const controller = wrapper.metatype
      if (!controller) continue
      const prototype = controller.prototype as Record<string, unknown>
      for (const methodName of Object.getOwnPropertyNames(prototype)) {
        const handler = prototype[methodName]
        if (methodName === 'constructor' || typeof handler !== 'function') continue
        const roles =
          (Reflect.getMetadata(ROLES_KEY, handler) as string[] | undefined) ??
          (Reflect.getMetadata(ROLES_KEY, controller) as string[] | undefined) ??
          []
        const authValue =
          (Reflect.getMetadata(AUTH_TYPE_KEY, handler) as AuthTypeDecoratorPayload | undefined) ??
          (Reflect.getMetadata(AUTH_TYPE_KEY, controller) as AuthTypeDecoratorPayload | undefined)
        const auth = authValue
          ? (Array.isArray(authValue.authTypes) ? authValue.authTypes : [authValue.authTypes]).map(String)
          : []
        const rate =
          (Reflect.getMetadata(AUTH_RATE_LIMIT_KEY, handler) as string | undefined) ??
          (Reflect.getMetadata(RESOURCE_RATE_LIMIT_KEY, handler) as string | undefined) ??
          'global'
        result.set(`${controller.name}_${methodName}`, { roles, auth, rate })
      }
    }
  }
  return result
}

function grouped(rows: Operation[]) {
  const result = new Map<string, Operation[]>()
  for (const row of rows) {
    const group = row.path.split('/').filter(Boolean)[0] ?? 'root'
    result.set(group, [...(result.get(group) ?? []), row])
  }
  return [...result.entries()].sort(([a], [b]) => a.localeCompare(b))
}

function runtimeIndex(document: OpenAPIObject) {
  const rows = operations(document)
  const lines = [
    '# Runtime API Index',
    '',
    `> Sinh tự động từ NestJS runtime ngày ${new Date().toISOString()}. Không chỉnh sửa thủ công.`,
    '',
    `- Tổng số operation: **${rows.length}**`,
    '- Swagger UI: `GET /docs`',
    '- OpenAPI JSON: `GET /docs-json`',
    '- Route protected dùng Bearer JWT; route staff theo tenant có thể yêu cầu `x-tenant-id`.',
    '- Error chung: `400`, `401`, `403`, `404`, `409`, `429`, `500`.',
    '',
  ]
  for (const [group, items] of grouped(rows)) {
    lines.push(`## ${group}`, '', '| Method | Path | Access | Operation ID | Responses |', '|---|---|---|---|---|')
    for (const row of items.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method)))
      lines.push(`| ${row.method} | \`${row.path}\` | ${row.access} | \`${row.operationId}\` | ${row.responses} |`)
    lines.push('')
  }
  return `${lines.join('\n')}\n`
}

function schemaName(schema: unknown) {
  if (!schema || typeof schema !== 'object') return 'không khai báo'
  if ('$ref' in schema && typeof schema.$ref === 'string') return `\`${schema.$ref.split('/').at(-1)}\``
  if ('type' in schema && typeof schema.type === 'string') return `\`${schema.type}\``
  return 'schema inline'
}

function apiReference(document: OpenAPIObject, meta: Map<string, RouteMeta>) {
  const rows = operations(document)
  const controllers = new Set(rows.map((row) => row.operationId.split('_')[0])).size
  const lines = [
    '# Tài liệu tham chiếu API hiện tại',
    '',
    `> Sinh tự động từ NestJS runtime ngày ${new Date().toISOString()}. Không chỉnh sửa thủ công.`,
    '',
    '## Quy ước chung',
    '',
    '- Base URL local: `http://localhost:3000`; không có global prefix `/api`.',
    '- Swagger UI: `GET /docs`; contract runtime: `GET /docs-json`.',
    '- Route protected dùng `Authorization: Bearer <access-token>`.',
    '- Route landlord/staff theo tenant truyền `x-tenant-id` khi guard tenant áp dụng.',
    '- Request được kiểm tra bằng Zod strict; ngày giờ dùng ISO 8601.',
    '- Error chuẩn: `{ statusCode, code, message, details?, timestamp, path, requestId }`.',
    '- Mọi route chịu global rate limit; profile riêng được ghi ở từng operation.',
    `- Tổng cộng **${rows.length} operation** thuộc **${controllers} controller**.`,
    '',
    '## Mục lục',
    '',
  ]
  for (const [group, items] of grouped(rows))
    lines.push(`- [${GROUPS[group]?.[0] ?? group} (${items.length})](#${group})`)
  lines.push('')
  for (const [group, items] of grouped(rows)) {
    const [title, spec] = GROUPS[group] ?? [group]
    lines.push(`<a id="${group}"></a>`, '', `## ${title}`, '')
    if (spec) lines.push(`Đặc tả nghiệp vụ: [${spec}](../specs/${spec}).`, '')
    for (const row of items.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method))) {
      const operation = document.paths[row.path][row.method.toLowerCase() as Method]
      const route = meta.get(row.operationId)
      const roles = route?.roles.length
        ? route.roles.map((role) => `\`${role}\``).join(', ')
        : 'không giới hạn role riêng'
      lines.push(
        `### ${row.method} \`${row.path}\``,
        '',
        `- Operation ID: \`${row.operationId}\`.`,
        `- Xác thực: ${row.access}; role: ${row.access === 'Công khai' ? 'không áp dụng' : roles}.`,
        `- Rate limit: \`${route?.rate ?? 'global'}\`.`,
        `- Response: ${row.responses}.`,
      )
      if (route?.auth.length) lines.push(`- Auth metadata: ${route.auth.map((item) => `\`${item}\``).join(', ')}.`)
      if (operation?.parameters?.length) {
        lines.push('', '| Tham số | Vị trí | Bắt buộc | Schema |', '|---|---|:---:|---|')
        for (const parameter of operation.parameters)
          lines.push(
            '$ref' in parameter
              ? `| \`${parameter.$ref.split('/').at(-1)}\` | ref | — | \`${parameter.$ref}\` |`
              : `| \`${parameter.name}\` | ${parameter.in} | ${parameter.required ? 'Có' : 'Không'} | ${schemaName(parameter.schema)} |`,
          )
      }
      const body = operation?.requestBody && !('$ref' in operation.requestBody) ? operation.requestBody : undefined
      if (body) {
        lines.push('', '**Request body**', '')
        for (const [contentType, media] of Object.entries(body.content ?? {}))
          lines.push(`- \`${contentType}\`: ${schemaName(media.schema)}; bắt buộc: ${body.required ? 'có' : 'không'}.`)
      }
      lines.push('')
    }
  }
  lines.push(
    '## Ví dụ xác thực',
    '',
    '```bash',
    'curl "http://localhost:3000/auth/profile" \\',
    '  -H "Authorization: Bearer <access-token>"',
    '```',
    '',
    'Với route staff theo tenant, thêm `-H "x-tenant-id: <tenant-id>"`. Không ghi secret thật vào tài liệu.',
    '',
  )
  return `${lines.join('\n')}\n`
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: false })
  try {
    const document = configureOpenApi(app)
    const output = resolve(process.cwd(), 'docs', 'api')
    await mkdir(output, { recursive: true })
    await Promise.all([
      writeFile(resolve(output, 'openapi.json'), `${JSON.stringify(document, null, 2)}\n`, 'utf8'),
      writeFile(resolve(output, 'API_RUNTIME_INDEX.md'), runtimeIndex(document), 'utf8'),
      writeFile(resolve(output, 'API_REFERENCE.md'), apiReference(document, routeMetadata(app)), 'utf8'),
    ])
    console.log(`Exported ${operations(document).length} operations to OpenAPI and Markdown references`)
  } finally {
    await app.close()
  }
}

void bootstrap()
