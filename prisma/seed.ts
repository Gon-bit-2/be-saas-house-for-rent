import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { hash } from 'bcrypt'
import { Pool } from 'pg'
import { PrismaClient } from '../generated/prisma/client'
import {
  BillingCycle,
  ContractBillingCycle,
  ContractMemberRole,
  ContractStatus,
  DebtStatus,
  InvoiceItemType,
  InvoiceStatus,
  MarketplaceStatus,
  MeterStatus,
  MeterType,
  PaymentMethod,
  PaymentStatus,
  PropertyStatus,
  PropertyType,
  ReadingSource,
  ReadingStatus,
  RentalHistoryStatus,
  RentalRequestStatus,
  RoomStatus,
  SubscriptionStatus,
  TenantMemberStatus,
  TenantStatus,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  UserStatus,
  VerificationStatus,
} from '../generated/prisma/enums'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required to seed the database')
if (process.env.NODE_ENV === 'production') throw new Error('Refusing to run the demo seed in production')

const pool = new Pool({ connectionString: databaseUrl })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
const fixedNow = new Date('2026-07-01T00:00:00.000Z')
const billingMonth = new Date('2026-07-01T00:00:00.000Z')
const contractStart = new Date('2026-01-01T00:00:00.000Z')
const contractEnd = new Date('2026-12-31T00:00:00.000Z')
const invoiceDueDate = new Date('2026-07-10T00:00:00.000Z')

const credentials = {
  admin: {
    email: process.env.SEED_ADMIN_EMAIL ?? 'admin@mvp.local',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!',
  },
  landlord: {
    email: process.env.SEED_LANDLORD_EMAIL ?? 'landlord@mvp.local',
    password: process.env.SEED_LANDLORD_PASSWORD ?? 'Landlord123!',
  },
  renter: {
    email: process.env.SEED_RENTER_EMAIL ?? 'renter@mvp.local',
    password: process.env.SEED_RENTER_PASSWORD ?? 'Renter123!',
  },
}

async function main() {
  const passwordHashes = await Promise.all([
    hash(credentials.admin.password, 10),
    hash(credentials.landlord.password, 10),
    hash(credentials.renter.password, 10),
  ])

  const result = await prisma.$transaction(async (tx) => {
    for (const [id, name] of [
      ['ADMIN', 'Super Admin'],
      ['LANDLORD', 'Landlord'],
      ['MANAGER', 'Manager'],
      ['ACCOUNTANT', 'Accountant'],
      ['MAINTENANCE_STAFF', 'Maintenance staff'],
      ['TENANT', 'Renter'],
    ] as const) {
      await tx.role.upsert({
        where: { id },
        update: { name },
        create: { id, name, description: `${name} role for the Web MVP` },
      })
    }

    const admin = await tx.user.upsert({
      where: { email: credentials.admin.email },
      update: {
        fullName: 'MVP Super Admin', passwordHash: passwordHashes[0], systemRole: 'ADMIN',
        status: UserStatus.ACTIVE, emailVerifiedAt: fixedNow, deletedAt: null,
      },
      create: {
        fullName: 'MVP Super Admin', email: credentials.admin.email, passwordHash: passwordHashes[0],
        systemRole: 'ADMIN', status: UserStatus.ACTIVE, emailVerifiedAt: fixedNow,
      },
    })
    const landlord = await tx.user.upsert({
      where: { email: credentials.landlord.email },
      update: {
        fullName: 'MVP Landlord', passwordHash: passwordHashes[1], systemRole: null,
        status: UserStatus.ACTIVE, emailVerifiedAt: fixedNow, deletedAt: null,
      },
      create: {
        fullName: 'MVP Landlord', email: credentials.landlord.email, passwordHash: passwordHashes[1],
        status: UserStatus.ACTIVE, emailVerifiedAt: fixedNow,
      },
    })
    const renter = await tx.user.upsert({
      where: { email: credentials.renter.email },
      update: {
        fullName: 'MVP Renter', passwordHash: passwordHashes[2], systemRole: null,
        status: UserStatus.ACTIVE, emailVerifiedAt: fixedNow, deletedAt: null,
      },
      create: {
        fullName: 'MVP Renter', email: credentials.renter.email, passwordHash: passwordHashes[2],
        status: UserStatus.ACTIVE, emailVerifiedAt: fixedNow,
      },
    })

    await tx.renterProfile.upsert({
      where: { userId: renter.id },
      update: { occupation: 'Software engineer', verificationStatus: VerificationStatus.VERIFIED },
      create: {
        userId: renter.id, occupation: 'Software engineer', permanentAddress: 'Ho Chi Minh City',
        verificationStatus: VerificationStatus.VERIFIED,
      },
    })

    const plan = await tx.plan.upsert({
      where: { code: 'MVP_PRO' },
      update: {
        name: 'MVP Pro', priceMonthly: 199000, priceYearly: 1990000, maxRooms: 100,
        maxStaff: 20, allowAiOcr: true, allowWebhookPayment: true, isActive: true,
      },
      create: {
        code: 'MVP_PRO', name: 'MVP Pro', description: 'Deterministic FE integration plan',
        priceMonthly: 199000, priceYearly: 1990000, maxRooms: 100, maxStaff: 20,
        allowAiOcr: true, allowWebhookPayment: true, createdById: admin.id,
      },
    })

    const tenant = await tx.tenant.upsert({
      where: { slug: 'mvp-demo-house' },
      update: {
        ownerUserId: landlord.id, name: 'MVP Demo House', status: TenantStatus.ACTIVE,
        verificationStatus: VerificationStatus.VERIFIED, deletedAt: null,
      },
      create: {
        ownerUserId: landlord.id, name: 'MVP Demo House', slug: 'mvp-demo-house',
        email: credentials.landlord.email, address: 'Thu Duc City, Ho Chi Minh City',
        status: TenantStatus.ACTIVE, verificationStatus: VerificationStatus.VERIFIED,
        createdById: admin.id,
      },
    })
    await tx.tenantMember.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: landlord.id } },
      update: { roleId: 'LANDLORD', status: TenantMemberStatus.ACTIVE, joinedAt: fixedNow },
      create: {
        tenantId: tenant.id, userId: landlord.id, roleId: 'LANDLORD',
        status: TenantMemberStatus.ACTIVE, joinedAt: fixedNow,
      },
    })

    const activeSubscription = await tx.subscription.findFirst({
      where: { tenantId: tenant.id, status: SubscriptionStatus.ACTIVE },
    })
    if (activeSubscription) {
      await tx.subscription.update({
        where: { id: activeSubscription.id },
        data: {
          planId: plan.id, startedAt: contractStart, expiredAt: new Date('2027-01-01T00:00:00.000Z'),
          billingCycle: BillingCycle.YEARLY, autoRenew: false,
        },
      })
    } else {
      await tx.subscription.create({
        data: {
          tenantId: tenant.id, planId: plan.id, status: SubscriptionStatus.ACTIVE,
          startedAt: contractStart, expiredAt: new Date('2027-01-01T00:00:00.000Z'),
          billingCycle: BillingCycle.YEARLY, autoRenew: false,
        },
      })
    }

    let property = await tx.property.findFirst({
      where: { tenantId: tenant.id, name: 'MVP Demo Building', deletedAt: null },
    })
    property ??= await tx.property.create({
      data: {
        tenantId: tenant.id, name: 'MVP Demo Building', type: PropertyType.MINI_APARTMENT,
        province: 'Ho Chi Minh City', district: 'Thu Duc City', ward: 'Linh Trung',
        addressDetail: '01 Demo Street', status: PropertyStatus.ACTIVE, createdById: landlord.id,
      },
    })
    let floor = await tx.floor.findFirst({
      where: { tenantId: tenant.id, propertyId: property.id, floorNumber: 1 },
    })
    floor ??= await tx.floor.create({
      data: { tenantId: tenant.id, propertyId: property.id, name: 'Floor 1', floorNumber: 1 },
    })

    let publicRoom = await tx.room.findFirst({
      where: { tenantId: tenant.id, roomCode: 'MVP-A101', deletedAt: null },
    })
    publicRoom = publicRoom
      ? await tx.room.update({
          where: { id: publicRoom.id },
          data: { status: RoomStatus.AVAILABLE, marketplaceStatus: MarketplaceStatus.PUBLISHED },
        })
      : await tx.room.create({
          data: {
            tenantId: tenant.id, propertyId: property.id, floorId: floor.id, roomCode: 'MVP-A101',
            title: 'Bright studio near university', area: 25, maxOccupants: 2, basePrice: 5500000,
            depositAmount: 5500000, electricityPrice: 3500, waterPrice: 20000,
            status: RoomStatus.AVAILABLE, marketplaceStatus: MarketplaceStatus.PUBLISHED,
            publishedAt: fixedNow, createdById: landlord.id,
          },
        })
    let occupiedRoom = await tx.room.findFirst({
      where: { tenantId: tenant.id, roomCode: 'MVP-A102', deletedAt: null },
    })
    occupiedRoom = occupiedRoom
      ? await tx.room.update({
          where: { id: occupiedRoom.id },
          data: { status: RoomStatus.OCCUPIED, marketplaceStatus: MarketplaceStatus.HIDDEN },
        })
      : await tx.room.create({
          data: {
            tenantId: tenant.id, propertyId: property.id, floorId: floor.id, roomCode: 'MVP-A102',
            title: 'Occupied MVP integration room', area: 30, maxOccupants: 3, basePrice: 6000000,
            depositAmount: 6000000, electricityPrice: 3500, waterPrice: 20000,
            status: RoomStatus.OCCUPIED, marketplaceStatus: MarketplaceStatus.HIDDEN,
            createdById: landlord.id,
          },
        })

    let request = await tx.rentalRequest.findFirst({
      where: { tenantId: tenant.id, roomId: occupiedRoom.id, renterId: renter.id },
    })
    request = request
      ? await tx.rentalRequest.update({
          where: { id: request.id }, data: { status: RentalRequestStatus.CONVERTED_TO_CONTRACT },
        })
      : await tx.rentalRequest.create({
          data: {
            tenantId: tenant.id, roomId: occupiedRoom.id, renterId: renter.id,
            expectedStartDate: contractStart, status: RentalRequestStatus.CONVERTED_TO_CONTRACT,
            message: 'Seeded rental journey', createdById: renter.id,
          },
        })
    const contract = await tx.contract.upsert({
      where: { contractCode: 'MVP-CONTRACT-2026-001' },
      update: {
        tenantId: tenant.id, roomId: occupiedRoom.id, renterId: renter.id, rentalRequestId: request.id,
        startDate: contractStart, endDate: contractEnd, status: ContractStatus.ACTIVE, deletedAt: null,
      },
      create: {
        tenantId: tenant.id, roomId: occupiedRoom.id, renterId: renter.id, rentalRequestId: request.id,
        contractCode: 'MVP-CONTRACT-2026-001', startDate: contractStart, endDate: contractEnd,
        monthlyPrice: 6000000, depositAmount: 6000000, billingCycle: ContractBillingCycle.MONTHLY,
        paymentDueDay: 10, contentSnapshot: 'MVP deterministic contract snapshot',
        status: ContractStatus.ACTIVE, signedByLandlordAt: contractStart, signedByRenterAt: contractStart,
        createdById: landlord.id,
      },
    })
    const existingMember = await tx.contractMember.findFirst({
      where: { contractId: contract.id, userId: renter.id }
    })
    if (existingMember) {
      await tx.contractMember.update({
        where: { id: existingMember.id },
        data: { role: ContractMemberRole.MAIN_RENTER }
      })
    } else {
      await tx.contractMember.create({
        data: { contractId: contract.id, userId: renter.id, role: ContractMemberRole.MAIN_RENTER }
      })
    }
    const internetService = await tx.serviceCatalogItem.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'INTERNET' } },
      update: { name: 'Internet', itemType: InvoiceItemType.INTERNET, defaultUnitPrice: 150000, isActive: true },
      create: {
        tenantId: tenant.id, code: 'INTERNET', name: 'Internet', itemType: InvoiceItemType.INTERNET,
        defaultUnitPrice: 150000, unitLabel: 'tháng', isActive: true,
      },
    })
    const existingInternetAssignment = await tx.serviceAssignment.findFirst({
      where: { tenantId: tenant.id, serviceItemId: internetService.id, contractId: contract.id },
      select: { id: true },
    })
    if (existingInternetAssignment) {
      await tx.serviceAssignment.update({
        where: { id: existingInternetAssignment.id },
        data: { roomId: null, quantity: 1, unitPrice: null, isActive: true, startsAt: contractStart, endsAt: contractEnd },
      })
    } else {
      await tx.serviceAssignment.create({
        data: {
          tenantId: tenant.id, serviceItemId: internetService.id, contractId: contract.id,
          quantity: 1, startsAt: contractStart, endsAt: contractEnd, isActive: true,
        },
      })
    }
    await tx.rentalHistory.upsert({
      where: { contractId: contract.id },
      update: { renterId: renter.id, tenantId: tenant.id, roomId: occupiedRoom.id, status: RentalHistoryStatus.ACTIVE },
      create: {
        renterId: renter.id, tenantId: tenant.id, roomId: occupiedRoom.id, contractId: contract.id,
        startedAt: contractStart, status: RentalHistoryStatus.ACTIVE,
      },
    })

    const electricityMeter = await tx.utilityMeter.upsert({
      where: { roomId_type: { roomId: occupiedRoom.id, type: MeterType.ELECTRICITY } },
      update: { meterCode: 'MVP-E-A102', status: MeterStatus.ACTIVE },
      create: {
        tenantId: tenant.id, roomId: occupiedRoom.id, type: MeterType.ELECTRICITY,
        meterCode: 'MVP-E-A102', unit: 'kWh', status: MeterStatus.ACTIVE,
      },
    })
    const waterMeter = await tx.utilityMeter.upsert({
      where: { roomId_type: { roomId: occupiedRoom.id, type: MeterType.WATER } },
      update: { meterCode: 'MVP-W-A102', status: MeterStatus.ACTIVE },
      create: {
        tenantId: tenant.id, roomId: occupiedRoom.id, type: MeterType.WATER,
        meterCode: 'MVP-W-A102', unit: 'm3', status: MeterStatus.ACTIVE,
      },
    })
    const electricityReading = await tx.meterReading.upsert({
      where: { meterId_billingMonth: { meterId: electricityMeter.id, billingMonth } },
      update: { contractId: contract.id, status: ReadingStatus.CONFIRMED },
      create: {
        tenantId: tenant.id, roomId: occupiedRoom.id, meterId: electricityMeter.id, contractId: contract.id,
        billingMonth, previousValue: 1000, currentValue: 1120, consumption: 120, unitPrice: 3500,
        amount: 420000, source: ReadingSource.MANUAL, status: ReadingStatus.CONFIRMED,
        createdById: landlord.id,
      },
    })
    const waterReading = await tx.meterReading.upsert({
      where: { meterId_billingMonth: { meterId: waterMeter.id, billingMonth } },
      update: { contractId: contract.id, status: ReadingStatus.CONFIRMED },
      create: {
        tenantId: tenant.id, roomId: occupiedRoom.id, meterId: waterMeter.id, contractId: contract.id,
        billingMonth, previousValue: 100, currentValue: 105, consumption: 5, unitPrice: 20000,
        amount: 100000, source: ReadingSource.MANUAL, status: ReadingStatus.CONFIRMED,
        createdById: landlord.id,
      },
    })

    const total = 6670000
    const paid = 2000000
    const remaining = total - paid
    const invoice = await tx.invoice.upsert({
      where: { invoiceCode: 'MVP-INV-2026-07-A102' },
      update: {
        contractId: contract.id, roomId: occupiedRoom.id, renterId: renter.id,
        paidAmount: paid, debtAmount: remaining, status: InvoiceStatus.PARTIALLY_PAID,
      },
      create: {
        tenantId: tenant.id, contractId: contract.id, roomId: occupiedRoom.id, renterId: renter.id,
        invoiceCode: 'MVP-INV-2026-07-A102', billingMonth, issueDate: fixedNow, dueDate: invoiceDueDate,
        subtotal: total, totalAmount: total, paidAmount: paid, debtAmount: remaining,
        status: InvoiceStatus.PARTIALLY_PAID, createdById: landlord.id,
      },
    })
    await tx.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } })
    await tx.invoiceItem.createMany({
      data: [
        { invoiceId: invoice.id, itemType: InvoiceItemType.RENT, description: 'Monthly rent', quantity: 1, unitPrice: 6000000, amount: 6000000 },
        { invoiceId: invoice.id, itemType: InvoiceItemType.ELECTRICITY, description: 'Electricity', quantity: 120, unitPrice: 3500, amount: 420000, meterReadingId: electricityReading.id },
        { invoiceId: invoice.id, itemType: InvoiceItemType.WATER, description: 'Water', quantity: 5, unitPrice: 20000, amount: 100000, meterReadingId: waterReading.id },
        { invoiceId: invoice.id, itemType: InvoiceItemType.INTERNET, description: 'Internet', quantity: 1, unitPrice: 150000, amount: 150000 },
      ],
    })
    await tx.debt.upsert({
      where: { invoiceId: invoice.id },
      update: { paidAmount: paid, remainingAmount: remaining, status: DebtStatus.PARTIAL },
      create: {
        tenantId: tenant.id, invoiceId: invoice.id, contractId: contract.id, roomId: occupiedRoom.id,
        renterId: renter.id, billingMonth, originalAmount: total, paidAmount: paid,
        remainingAmount: remaining, status: DebtStatus.PARTIAL, dueDate: invoiceDueDate,
      },
    })
    await tx.payment.upsert({
      where: { provider_transactionCode: { provider: 'MVP_SEED', transactionCode: 'MVP-PAYMENT-2026-07-001' } },
      update: { invoiceId: invoice.id, payerId: renter.id, amount: paid, status: PaymentStatus.SUCCESS },
      create: {
        tenantId: tenant.id, invoiceId: invoice.id, payerId: renter.id, amount: paid,
        method: PaymentMethod.BANK_TRANSFER, provider: 'MVP_SEED', transactionCode: 'MVP-PAYMENT-2026-07-001',
        status: PaymentStatus.SUCCESS, paidAt: fixedNow, submittedAt: fixedNow,
        approvedById: landlord.id, approvedAt: fixedNow, createdById: renter.id,
      },
    })

    let ticket = await tx.ticket.findFirst({
      where: { tenantId: tenant.id, roomId: occupiedRoom.id, createdById: renter.id, title: 'MVP seeded water leak' },
    })
    ticket ??= await tx.ticket.create({
      data: {
        tenantId: tenant.id, roomId: occupiedRoom.id, contractId: contract.id,
        title: 'MVP seeded water leak', description: 'Open ticket for the renter dashboard',
        category: TicketCategory.WATER, priority: TicketPriority.HIGH,
        status: TicketStatus.OPEN, createdById: renter.id,
      },
    })

    return { tenant, property, publicRoom, occupiedRoom, contract, invoice, ticket }
  })

  console.log(JSON.stringify({
    message: 'Web MVP seed is ready', credentials,
    ids: {
      tenantId: result.tenant.id, propertyId: result.property.id,
      publicRoomId: result.publicRoom.id, occupiedRoomId: result.occupiedRoom.id,
      contractId: result.contract.id, invoiceId: result.invoice.id, ticketId: result.ticket.id,
    },
  }, null, 2))
}

main()
  .catch((error: unknown) => {
    console.error('Web MVP seed failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
