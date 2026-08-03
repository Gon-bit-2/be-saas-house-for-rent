import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { ZodValidationPipe } from 'nestjs-zod'
import request from 'supertest'
import { App } from 'supertest/types'
import { AppModule } from '../src/app.module'
import { ApiExceptionFilter } from '../src/common/filters/api-exception.filter'
import { configureOpenApi } from '../src/config/openapi.config'
import { PrismaService } from '../src/shared/modules/database/prisma.service'
import { TokenService } from '../src/shared/modules/services/token.service'

describe('Backend Web MVP integration (e2e)', () => {
  jest.setTimeout(120_000)

  let app: INestApplication<App>
  let prisma: PrismaService
  let landlordToken: string
  let renterToken: string
  let tenantId: number
  let ownPropertyId: number
  let isolationTenantId: number
  let isolationPropertyId: number

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ZodValidationPipe())
    app.useGlobalFilters(new ApiExceptionFilter())
    configureOpenApi(app)
    await app.init()

    prisma = app.get(PrismaService)
    const tokenService = app.get(TokenService)
    const [admin, landlord, renter, tenant, ownProperty] = await Promise.all([
      prisma.user.findUnique({ where: { email: process.env.SEED_ADMIN_EMAIL ?? 'admin@mvp.local' } }),
      prisma.user.findUnique({ where: { email: process.env.SEED_LANDLORD_EMAIL ?? 'landlord@mvp.local' } }),
      prisma.user.findUnique({ where: { email: process.env.SEED_RENTER_EMAIL ?? 'renter@mvp.local' } }),
      prisma.tenant.findUnique({ where: { slug: 'mvp-demo-house' } }),
      prisma.property.findFirst({ where: { name: 'MVP Demo Building', deletedAt: null } }),
    ])
    if (!admin || !landlord || !renter || !tenant || !ownProperty) {
      throw new Error('E2E seed is missing. Run `npm run db:seed` before the integration suite.')
    }

    landlordToken = await tokenService.signAccessToken({ userId: landlord.id, ver: 2 })
    renterToken = await tokenService.signAccessToken({ userId: renter.id, ver: 2 })
    tenantId = tenant.id
    ownPropertyId = ownProperty.id

    await prisma.tenant.deleteMany({ where: { slug: 'e2e-isolation-boundary' } })
    const isolationTenant = await prisma.tenant.create({
      data: {
        ownerUserId: admin.id,
        name: 'E2E Isolation Boundary',
        slug: 'e2e-isolation-boundary',
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        createdById: admin.id,
      },
    })
    const isolationProperty = await prisma.property.create({
      data: {
        tenantId: isolationTenant.id,
        name: 'E2E Private Property',
        type: 'HOUSE',
        province: 'Ho Chi Minh City',
        district: 'Test District',
        ward: 'Test Ward',
        addressDetail: 'Must never be returned to another tenant',
        createdById: admin.id,
      },
    })
    isolationTenantId = isolationTenant.id
    isolationPropertyId = isolationProperty.id
  })

  afterAll(async () => {
    if (prisma && isolationTenantId) {
      await prisma.tenant.deleteMany({ where: { id: isolationTenantId, slug: 'e2e-isolation-boundary' } })
    }
    if (app) await app.close()
  })

  it('serves the public marketplace and generated OpenAPI contract', async () => {
    const marketplace = await request(app.getHttpServer()).get('/marketplace/rooms').expect(200)
    expect(marketplace.body.data).toEqual(expect.any(Array))
    expect(marketplace.body.data.length).toBeGreaterThan(0)
    expect(marketplace.body.data[0]).not.toHaveProperty('tenantId')
    expect(marketplace.body.data[0].property).not.toHaveProperty('addressDetail')
    expect(marketplace.body.data[0].property).not.toHaveProperty('latitude')
    expect(marketplace.body.data[0].property).not.toHaveProperty('longitude')

    const openApi = await request(app.getHttpServer()).get('/docs-json').expect(200)
    expect(openApi.body.paths['/marketplace/rooms']).toBeDefined()
    expect(openApi.body.paths['/payments/me']).toBeDefined()
    expect(openApi.body.components.schemas.ApiErrorResponse).toBeDefined()
  })

  it('returns the stable error contract with request correlation', async () => {
    const response = await request(app.getHttpServer())
      .get('/marketplace/rooms/not-a-number')
      .set('x-request-id', 'e2e-request-id')
      .expect(400)

    expect(response.headers['x-request-id']).toBe('e2e-request-id')
    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 400,
        code: expect.any(String),
        message: expect.any(String),
        path: '/marketplace/rooms/not-a-number',
        requestId: 'e2e-request-id',
      }),
    )
  })

  it('runs renter invoice, debt and payment self-service through HTTP and PostgreSQL', async () => {
    const authorization = `Bearer ${renterToken}`
    const invoices = await request(app.getHttpServer())
      .get('/invoices/me')
      .set('authorization', authorization)
      .expect(200)
    const debts = await request(app.getHttpServer())
      .get('/invoices/debts/me')
      .set('authorization', authorization)
      .expect(200)
    const payments = await request(app.getHttpServer())
      .get('/payments/me')
      .set('authorization', authorization)
      .expect(200)

    expect(invoices.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ renterId: expect.any(Number) })]),
    )
    expect(debts.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ renterId: expect.any(Number) })]))
    expect(payments.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ payerId: expect.any(Number) })]),
    )
  })

  it('reads the complete seeded Web MVP journey through HTTP and PostgreSQL', async () => {
    const renterAuthorization = `Bearer ${renterToken}`
    const landlordAuthorization = `Bearer ${landlordToken}`
    const tenantHeader = String(tenantId)

    await request(app.getHttpServer()).get('/auth/profile').set('authorization', renterAuthorization).expect(200)
    const marketplace = await request(app.getHttpServer()).get('/marketplace/rooms?search=MVP-A101').expect(200)
    expect(marketplace.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ roomCode: 'MVP-A101' })]))

    const rentalRequests = await request(app.getHttpServer())
      .get('/rental-requests/me')
      .set('authorization', renterAuthorization)
      .expect(200)
    const rentalRequest = rentalRequests.body.data.find(
      (item: { status?: string }) => item.status === 'CONVERTED_TO_CONTRACT',
    )
    expect(rentalRequest).toBeDefined()

    const contracts = await request(app.getHttpServer())
      .get('/contracts/me')
      .set('authorization', renterAuthorization)
      .expect(200)
    const contract = contracts.body.data.find(
      (item: { contractCode?: string }) => item.contractCode === 'MVP-CONTRACT-2026-001',
    )
    expect(contract).toEqual(expect.objectContaining({ status: 'ACTIVE', rentalRequestId: rentalRequest.id }))

    const readings = await request(app.getHttpServer())
      .get(`/meter-readings?roomId=${contract.roomId}`)
      .set('authorization', landlordAuthorization)
      .set('x-tenant-id', tenantHeader)
      .expect(200)
    expect(readings.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ contractId: contract.id, status: 'CONFIRMED' })]),
    )

    const invoices = await request(app.getHttpServer())
      .get('/invoices/me')
      .set('authorization', renterAuthorization)
      .expect(200)
    const invoice = invoices.body.data.find((item: { contractId?: number }) => item.contractId === contract.id)
    expect(invoice).toBeDefined()

    const payments = await request(app.getHttpServer())
      .get(`/payments/me?invoiceId=${invoice.id}`)
      .set('authorization', renterAuthorization)
      .expect(200)
    expect(payments.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ invoiceId: invoice.id, status: 'SUCCESS' })]),
    )

    const tickets = await request(app.getHttpServer())
      .get(`/tickets/me?contractId=${contract.id}`)
      .set('authorization', renterAuthorization)
      .expect(200)
    expect(tickets.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ contractId: contract.id, title: 'MVP seeded water leak' })]),
    )
  })

  it('enforces tenant context and resource isolation through the complete guard pipeline', async () => {
    const authorization = `Bearer ${landlordToken}`
    await request(app.getHttpServer())
      .get(`/properties/${ownPropertyId}`)
      .set('authorization', authorization)
      .set('x-tenant-id', String(tenantId))
      .expect(200)

    const crossTenantResource = await request(app.getHttpServer())
      .get(`/properties/${isolationPropertyId}`)
      .set('authorization', authorization)
      .set('x-tenant-id', String(tenantId))
      .expect(404)
    expect(crossTenantResource.body.code).toBe('NOT_FOUND')

    const invalidContext = await request(app.getHttpServer())
      .get(`/properties/${isolationPropertyId}`)
      .set('authorization', authorization)
      .set('x-tenant-id', String(isolationTenantId))
      .expect(403)
    expect(invalidContext.body.message).toBe('TENANT_ACCESS_DENIED')
  })
})
