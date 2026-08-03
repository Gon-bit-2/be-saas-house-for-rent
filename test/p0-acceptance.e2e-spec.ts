import { getQueueToken } from '@nestjs/bullmq'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { ZodValidationPipe } from 'nestjs-zod'
import request from 'supertest'
import { App } from 'supertest/types'
import { AppModule } from '../src/app.module'
import { ApiExceptionFilter } from '../src/common/filters/api-exception.filter'
import { configureOpenApi } from '../src/config/openapi.config'
import { FirebasePushService } from '../src/modules/notifications/firebase-push.service'
import { NOTIFICATIONS_QUEUE } from '../src/modules/notifications/notifications.constants'
import { PrismaService } from '../src/shared/modules/database/prisma.service'
import { CloudinaryService } from '../src/shared/modules/services/cloudinary.service'
import { EmailService } from '../src/shared/modules/services/email.service'
import { TokenService } from '../src/shared/modules/services/token.service'

describe('P0 FE integration acceptance (e2e)', () => {
  jest.setTimeout(180_000)

  let app: INestApplication<App>
  let prisma: PrismaService
  let tokenService: TokenService
  let tenantId: number
  let landlordId: number
  let renterId: number
  let secondRenterId: number
  let maintenanceId: number
  let adminId: number
  let propertyId: number
  let seededRoomId: number
  let contractId: number
  let landlordToken: string
  let renterToken: string
  let secondRenterToken: string
  let maintenanceToken: string
  let adminToken: string
  const otpByEmail = new Map<string, string>()

  const auth = (token: string) => ({ authorization: `Bearer ${token}` })
  const tenantAuth = (token: string, selectedTenantId = tenantId) => ({
    authorization: `Bearer ${token}`,
    'x-tenant-id': String(selectedTenantId),
  })

  beforeAll(async () => {
    const emailMock = {
      sendOtpEmail: jest.fn(async (payload: { email: string; code: string }) => {
        otpByEmail.set(payload.email, payload.code)
      }),
    }
    const cloudinaryMock = {
      uploadImage: jest.fn(async (_file: Express.Multer.File, folder: string) => ({
        url: `https://assets.e2e.local/${folder}/fixture.png`,
        publicId: `${folder}/fixture`,
      })),
      deleteImage: jest.fn(async () => undefined),
    }
    const queueMock = { add: jest.fn(async () => ({ id: 'e2e-job' })) }

    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EmailService)
      .useValue(emailMock)
      .overrideProvider(CloudinaryService)
      .useValue(cloudinaryMock)
      .overrideProvider(FirebasePushService)
      .useValue({ sendToTokens: jest.fn(async () => []) })
      .overrideProvider(getQueueToken(NOTIFICATIONS_QUEUE))
      .useValue(queueMock)
      .compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ZodValidationPipe())
    app.useGlobalFilters(new ApiExceptionFilter())
    configureOpenApi(app)
    await app.init()

    prisma = app.get(PrismaService)
    tokenService = app.get(TokenService)

    const [admin, landlord, renter, tenant, property, room, contract] = await Promise.all([
      prisma.user.findUnique({ where: { email: process.env.SEED_ADMIN_EMAIL ?? 'admin@mvp.local' } }),
      prisma.user.findUnique({ where: { email: process.env.SEED_LANDLORD_EMAIL ?? 'landlord@mvp.local' } }),
      prisma.user.findUnique({ where: { email: process.env.SEED_RENTER_EMAIL ?? 'renter@mvp.local' } }),
      prisma.tenant.findUnique({ where: { slug: 'mvp-demo-house' } }),
      prisma.property.findFirst({ where: { name: 'MVP Demo Building', deletedAt: null } }),
      prisma.room.findFirst({ where: { roomCode: 'MVP-A101', deletedAt: null } }),
      prisma.contract.findUnique({ where: { contractCode: 'MVP-CONTRACT-2026-001' } }),
    ])
    if (!admin || !landlord || !renter || !tenant || !property || !room || !contract) {
      throw new Error('P0 E2E seed is missing. Run `npm run db:seed` against DATABASE_URL_E2E.')
    }

    adminId = admin.id
    landlordId = landlord.id
    renterId = renter.id
    tenantId = tenant.id
    propertyId = property.id
    seededRoomId = room.id
    contractId = contract.id

    const suffix = Date.now()
    const [secondRenter, maintenance] = await Promise.all([
      prisma.user.create({
        data: {
          fullName: 'P0 Second Renter',
          email: `p0-renter-${suffix}@e2e.local`,
          passwordHash: 'not-used-by-token-auth',
          emailVerifiedAt: new Date(),
          renterProfile: { create: {} },
          tenantMembers: {
            create: { tenantId, roleId: 'TENANT', status: 'ACTIVE', joinedAt: new Date() },
          },
        },
      }),
      prisma.user.create({
        data: {
          fullName: 'P0 Maintenance',
          email: `p0-maintenance-${suffix}@e2e.local`,
          passwordHash: 'not-used-by-token-auth',
          emailVerifiedAt: new Date(),
          tenantMembers: {
            create: { tenantId, roleId: 'MAINTENANCE_STAFF', status: 'ACTIVE', joinedAt: new Date() },
          },
        },
      }),
    ])
    secondRenterId = secondRenter.id
    maintenanceId = maintenance.id
    ;[adminToken, landlordToken, renterToken, secondRenterToken, maintenanceToken] = await Promise.all([
      tokenService.signAccessToken({ userId: adminId, ver: 2 }),
      tokenService.signAccessToken({ userId: landlordId, ver: 2 }),
      tokenService.signAccessToken({ userId: renterId, ver: 2 }),
      tokenService.signAccessToken({ userId: secondRenterId, ver: 2 }),
      tokenService.signAccessToken({ userId: maintenanceId, ver: 2 }),
    ])
  })

  afterAll(async () => {
    if (app) await app.close()
  })

  it('login hai bước bằng OTP, rotate refresh token, chặn replay và đọc profile', async () => {
    const email = process.env.SEED_RENTER_EMAIL ?? 'renter@mvp.local'
    const passwordHash = process.env.SEED_RENTER_PASSWORD ?? 'Renter123!'

    await request(app.getHttpServer()).post('/auth/login').send({ email, passwordHash }).expect(201)
    const code = otpByEmail.get(email)
    expect(code).toMatch(/^\d{6}$/)

    const login = await request(app.getHttpServer()).post('/auth/login').send({ email, passwordHash, code }).expect(201)
    expect(login.body).toEqual({ accessToken: expect.any(String), refreshToken: expect.any(String) })

    const rotated = await request(app.getHttpServer())
      .post('/auth/refresh-token')
      .send({ refreshToken: login.body.refreshToken })
      .expect(201)
    expect(rotated.body.refreshToken).not.toBe(login.body.refreshToken)

    await request(app.getHttpServer())
      .post('/auth/refresh-token')
      .send({ refreshToken: login.body.refreshToken })
      .expect(401)
    await request(app.getHttpServer()).get('/auth/profile').set(auth(rotated.body.accessToken)).expect(200)
  })

  it('tạo property/room, submit moderation, publish, đặt lịch/yêu cầu thuê và approve', async () => {
    const property = await request(app.getHttpServer())
      .post('/properties')
      .set(tenantAuth(landlordToken))
      .send({
        name: `P0 Acceptance Property ${Date.now()}`,
        type: 'MINI_APARTMENT',
        province: 'Ho Chi Minh City',
        district: 'District 1',
        ward: 'Ben Nghe',
        addressDetail: 'Disposable E2E address',
      })
      .expect(201)

    const room = await request(app.getHttpServer())
      .post('/rooms')
      .set(tenantAuth(landlordToken))
      .send({
        propertyId: property.body.id,
        roomCode: `P0-${Date.now()}`,
        title: 'P0 Acceptance Room',
        area: 28,
        maxOccupants: 2,
        basePrice: 4500000,
        depositAmount: 4500000,
        electricityPrice: 3500,
        waterPrice: 20000,
        status: 'AVAILABLE',
        amenityIds: [],
      })
      .expect(201)

    await request(app.getHttpServer())
      .post(`/rooms/${room.body.id}/images`)
      .set(tenantAuth(landlordToken))
      .attach('files', Buffer.from('p0-room-image'), { filename: 'room.png', contentType: 'image/png' })
      .expect(201)
    await request(app.getHttpServer())
      .patch(`/rooms/${room.body.id}/marketplace`)
      .set(tenantAuth(landlordToken))
      .send({ marketplaceStatus: 'PENDING_REVIEW' })
      .expect(200)
    await request(app.getHttpServer())
      .patch(`/marketplace/admin/rooms/${room.body.id}/status`)
      .set(auth(adminToken))
      .send({ marketplaceStatus: 'PUBLISHED' })
      .expect(200)
    await request(app.getHttpServer()).get(`/marketplace/rooms/${room.body.id}`).expect(200)

    const scheduledAt = new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString()
    const appointment = await request(app.getHttpServer())
      .post(`/marketplace/rooms/${room.body.id}/viewing-appointments`)
      .set(auth(renterToken))
      .send({ scheduledAt, note: 'P0 appointment' })
      .expect(201)
    const rentalRequest = await request(app.getHttpServer())
      .post(`/marketplace/rooms/${room.body.id}/rental-requests`)
      .set(auth(renterToken))
      .send({
        expectedStartDate: new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString().slice(0, 10),
        appointmentId: appointment.body.id,
        message: 'P0 rental request',
      })
      .expect(201)
    await request(app.getHttpServer())
      .patch(`/rental-requests/${rentalRequest.body.id}/decision`)
      .set(tenantAuth(landlordToken))
      .send({ status: 'APPROVED' })
      .expect(200)
  })

  it('ticket upload, assign, resolve, renter close và history; maintenance bị chặn trước assign', async () => {
    const ticket = await request(app.getHttpServer())
      .post('/tickets')
      .set(auth(renterToken))
      .send({
        roomId: seededRoomId,
        contractId,
        title: `P0 ticket ${Date.now()}`,
        description: 'Water leak used by disposable acceptance test',
        category: 'WATER',
        priority: 'HIGH',
        attachments: [],
      })
      .expect(201)

    await request(app.getHttpServer())
      .post(`/tickets/${ticket.body.id}/attachments/upload`)
      .set(auth(renterToken))
      .attach('file', Buffer.from('p0-ticket-image'), { filename: 'ticket.png', contentType: 'image/png' })
      .expect(201)
    await request(app.getHttpServer()).get(`/tickets/${ticket.body.id}`).set(tenantAuth(maintenanceToken)).expect(404)
    await request(app.getHttpServer())
      .patch(`/tickets/${ticket.body.id}/assign`)
      .set(tenantAuth(landlordToken))
      .send({ assignedTo: maintenanceId })
      .expect(200)
    await request(app.getHttpServer()).get(`/tickets/${ticket.body.id}`).set(tenantAuth(maintenanceToken)).expect(200)
    await request(app.getHttpServer())
      .patch(`/tickets/${ticket.body.id}/status`)
      .set(tenantAuth(maintenanceToken))
      .send({ status: 'RESOLVED' })
      .expect(200)
    await request(app.getHttpServer())
      .patch(`/tickets/me/${ticket.body.id}/close`)
      .set(auth(renterToken))
      .send({})
      .expect(200)
    const history = await request(app.getHttpServer())
      .get(`/tickets/me/${ticket.body.id}/history`)
      .set(auth(renterToken))
      .expect(200)
    expect(history.body.data.map((item: { action: string }) => item.action)).toEqual(
      expect.arrayContaining(['ASSIGN_TICKET', 'UPDATE_TICKET_STATUS', 'RENTER_CLOSE_TICKET']),
    )
  })

  it('notification REST giữ đúng user, unread-count giảm sau mark read', async () => {
    const before = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set(auth(renterToken))
      .expect(200)
    const notification = await prisma.notification.create({
      data: {
        userId: renterId,
        tenantId,
        title: 'P0 notification',
        content: 'Acceptance notification',
        type: 'SYSTEM',
        data: { journey: 'p0' },
      },
    })

    const list = await request(app.getHttpServer())
      .get('/notifications?isRead=false')
      .set(auth(renterToken))
      .expect(200)
    expect(list.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: notification.id, userId: renterId })]),
    )
    expect(list.body.data.every((item: { userId: number }) => item.userId === renterId)).toBe(true)

    await request(app.getHttpServer())
      .patch(`/notifications/${notification.id}/read`)
      .set(auth(renterToken))
      .send({})
      .expect(200)
    const after = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set(auth(renterToken))
      .expect(200)
    expect(after.body).toBe(before.body)
  })

  it('cô lập tenant resource và từ chối tenant header không thuộc membership', async () => {
    const isolationTenant = await prisma.tenant.create({
      data: {
        ownerUserId: adminId,
        name: `P0 Isolation ${Date.now()}`,
        slug: `p0-isolation-${Date.now()}`,
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        createdById: adminId,
      },
    })
    const isolationProperty = await prisma.property.create({
      data: {
        tenantId: isolationTenant.id,
        name: 'P0 private property',
        type: 'HOUSE',
        province: 'Ho Chi Minh City',
        district: 'Test District',
        ward: 'Test Ward',
        addressDetail: 'Private',
        createdById: adminId,
      },
    })

    await request(app.getHttpServer())
      .get(`/properties/${isolationProperty.id}`)
      .set(tenantAuth(landlordToken))
      .expect(404)
    await request(app.getHttpServer())
      .get(`/properties/${isolationProperty.id}`)
      .set(tenantAuth(landlordToken, isolationTenant.id))
      .expect(403)
  })

  it('serialize approve rental request và lịch hẹn trùng 60 phút', async () => {
    const room = await prisma.room.create({
      data: {
        tenantId,
        propertyId,
        roomCode: `P0-CONC-${Date.now()}`,
        title: 'P0 Concurrency Room',
        area: 30,
        maxOccupants: 2,
        basePrice: 5000000,
        depositAmount: 5000000,
        electricityPrice: 3500,
        waterPrice: 20000,
        status: 'AVAILABLE',
        marketplaceStatus: 'PUBLISHED',
        publishedAt: new Date(),
        createdById: landlordId,
      },
    })
    const requests = await Promise.all(
      [renterId, secondRenterId].map((candidateId) =>
        prisma.rentalRequest.create({
          data: {
            tenantId,
            roomId: room.id,
            renterId: candidateId,
            expectedStartDate: new Date(Date.now() + 30 * 24 * 60 * 60_000),
            status: 'PENDING',
            createdById: candidateId,
          },
        }),
      ),
    )
    const decisions = await Promise.all(
      requests.map((candidate) =>
        request(app.getHttpServer())
          .patch(`/rental-requests/${candidate.id}/decision`)
          .set(tenantAuth(landlordToken))
          .send({ status: 'APPROVED' }),
      ),
    )
    expect(decisions.map((response) => response.status).sort()).toEqual([200, 409])
    expect(await prisma.rentalRequest.count({ where: { roomId: room.id, status: 'APPROVED' } })).toBe(1)

    await prisma.room.update({
      where: { id: room.id },
      data: { status: 'AVAILABLE', marketplaceStatus: 'PUBLISHED' },
    })
    const scheduledAt = new Date(Date.now() + 14 * 24 * 60 * 60_000).toISOString()
    const appointments = await Promise.all(
      [renterToken, secondRenterToken].map((token) =>
        request(app.getHttpServer())
          .post(`/marketplace/rooms/${room.id}/viewing-appointments`)
          .set(auth(token))
          .send({ scheduledAt }),
      ),
    )
    expect(appointments.map((response) => response.status).sort()).toEqual([201, 409])
  })

  it('serialize ticket transition, trả 409 cho loser và chỉ ghi một history entry', async () => {
    const ticket = await prisma.ticket.create({
      data: {
        tenantId,
        roomId: seededRoomId,
        contractId,
        assignedTo: maintenanceId,
        title: `P0 concurrent ticket ${Date.now()}`,
        description: 'Concurrent ticket transition',
        category: 'OTHER',
        priority: 'MEDIUM',
        status: 'OPEN',
        createdById: renterId,
      },
    })
    const transitions = await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer())
          .patch(`/tickets/${ticket.id}/status`)
          .set(tenantAuth(maintenanceToken))
          .send({ status: 'IN_PROGRESS' }),
      ),
    )
    expect(transitions.map((response) => response.status).sort()).toEqual([200, 409])
    expect(
      await prisma.auditLog.count({
        where: { entityType: 'TICKET', entityId: String(ticket.id), action: 'UPDATE_TICKET_STATUS' },
      }),
    ).toBe(1)
  })
})
