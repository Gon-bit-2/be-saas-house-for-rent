import type { OpenAPIObject } from '@nestjs/swagger'

type Schema = Record<string, unknown>

const ref = (name: string): Schema => ({ $ref: '#/components/schemas/' + name })
const nullable = (schema: Schema): Schema => ({ oneOf: [schema, { type: 'null' }] })
const arrayOf = (name: string): Schema => ({ type: 'array', items: ref(name) })
const enumOf = (...values: string[]): Schema => ({ type: 'string', enum: values })
const object = (required: string[], properties: Record<string, Schema>): Schema => ({
  type: 'object',
  required,
  properties,
  additionalProperties: false,
})

const id = { type: 'integer', minimum: 1 }
const count = { type: 'integer', minimum: 0 }
const text = { type: 'string' }
const date = { type: 'string', format: 'date' }
const dateTime = { type: 'string', format: 'date-time' }
const decimal = { type: 'string', format: 'decimal', pattern: '^-?\\d+(?:\\.\\d+)?$' }
const jsonValue = {
  description: 'Arbitrary JSON business payload',
  oneOf: [
    { type: 'object', additionalProperties: true },
    { type: 'array', items: {} },
    { type: 'string' },
    { type: 'number' },
    { type: 'boolean' },
    { type: 'null' },
  ],
}
const timestamps = { createdAt: dateTime, updatedAt: dateTime, deletedAt: nullable(dateTime) }

export const FE_PRIORITY_PATH =
  /^(?:\/(?:auth|properties|rooms|marketplace|rental-requests|room-viewing-appointments|contracts|invoices|payments|tickets|notifications|device-tokens)(?:\/|$)|\/renters\/invitations\/\{id\}$|\/dashboard\/action-center$)/

export const FE_PRIORITY_COMPONENTS: Record<string, Schema> = {
  PaginationMeta: object(['page', 'limit', 'total', 'totalPages'], {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    total: count,
    totalPages: count,
  }),
  MessageResponse: object(['message'], { message: text }),
  OTPRequiredResponse: object(['message', 'otpRequired', 'resendAfterSeconds'], {
    message: text,
    otpRequired: { type: 'boolean', const: true },
    resendAfterSeconds: { type: 'integer', minimum: 1 },
  }),
  TokenPair: object(['accessToken', 'refreshToken'], { accessToken: text, refreshToken: text }),
  UrlResponse: object(['url'], { url: { type: 'string', format: 'uri' } }),
  UnreadCount: object(['unreadCount'], { unreadCount: count }),
  PermissionSummary: object(['id', 'code', 'name', 'module'], {
    id,
    code: text,
    name: text,
    module: text,
    description: nullable(text),
  }),
  RoleSummary: object(['id', 'name'], {
    id: text,
    name: text,
    description: nullable(text),
    permissions: arrayOf('PermissionSummary'),
  }),
  TenantSummary: object(['id', 'name', 'slug', 'status', 'ownerUserId'], {
    id,
    name: text,
    slug: text,
    status: enumOf('ACTIVE', 'SUSPENDED', 'CLOSED'),
    ownerUserId: id,
  }),
  TenantMembership: object(['id', 'tenantId', 'roleId', 'status', 'tenant', 'role'], {
    id,
    tenantId: id,
    roleId: text,
    status: enumOf('ACTIVE', 'INVITED', 'DISABLED'),
    joinedAt: nullable(dateTime),
    tenant: ref('TenantSummary'),
    role: ref('RoleSummary'),
  }),
  UserSummary: object(['id', 'fullName', 'email'], {
    id,
    fullName: text,
    email: { type: 'string', format: 'email' },
    phone: nullable(text),
    avatarUrl: nullable({ type: 'string', format: 'uri' }),
    status: enumOf('ACTIVE', 'INACTIVE', 'BANNED'),
  }),
  UserProfile: object(['id', 'fullName', 'email', 'status', 'tenantMembers', 'createdAt', 'updatedAt'], {
    id,
    fullName: text,
    email: { type: 'string', format: 'email' },
    phone: nullable(text),
    systemRole: nullable(text),
    avatarUrl: nullable({ type: 'string', format: 'uri' }),
    status: enumOf('ACTIVE', 'INACTIVE', 'BANNED'),
    emailVerifiedAt: nullable(dateTime),
    phoneVerifiedAt: nullable(dateTime),
    lastLoginAt: nullable(dateTime),
    tenantMembers: arrayOf('TenantMembership'),
    renterProfile: nullable(
      object(['id', 'verificationStatus'], {
        id,
        verificationStatus: enumOf('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'),
      }),
    ),
    ...timestamps,
  }),
  Floor: object(['id', 'tenantId', 'propertyId', 'name', 'floorNumber'], {
    id,
    tenantId: id,
    propertyId: id,
    name: text,
    floorNumber: { type: 'integer' },
    description: nullable(text),
    ...timestamps,
  }),
  Property: object(['id', 'tenantId', 'name', 'type', 'status', 'province', 'district', 'ward', 'addressDetail'], {
    id,
    tenantId: id,
    name: text,
    type: enumOf('HOUSE', 'MINI_APARTMENT', 'DORM', 'APARTMENT'),
    status: enumOf('ACTIVE', 'INACTIVE', 'MAINTENANCE'),
    province: text,
    district: text,
    ward: text,
    addressDetail: text,
    latitude: nullable({ type: 'number', minimum: -90, maximum: 90 }),
    longitude: nullable({ type: 'number', minimum: -180, maximum: 180 }),
    description: nullable(text),
    floors: arrayOf('Floor'),
    ...timestamps,
  }),
  PublicProperty: object(['id', 'name', 'type', 'status', 'province', 'district', 'ward'], {
    id,
    name: text,
    type: enumOf('HOUSE', 'MINI_APARTMENT', 'DORM', 'APARTMENT'),
    status: enumOf('ACTIVE', 'INACTIVE', 'MAINTENANCE'),
    province: text,
    provinceCode: nullable(text),
    district: text,
    ward: text,
    wardCode: nullable(text),
  }),
  MarketplacePropertyDetail: object(['id', 'name', 'type', 'status', 'province', 'district', 'ward'], {
    id,
    name: text,
    type: enumOf('HOUSE', 'MINI_APARTMENT', 'DORM', 'APARTMENT'),
    status: enumOf('ACTIVE', 'INACTIVE', 'MAINTENANCE'),
    province: text,
    provinceCode: nullable(text),
    district: text,
    ward: text,
    wardCode: nullable(text),
    addressDetail: nullable(text),
    latitude: nullable({ type: 'number', minimum: -90, maximum: 90 }),
    longitude: nullable({ type: 'number', minimum: -180, maximum: 180 }),
  }),
  MarketplaceRoomImage: object(['id', 'url', 'sortOrder', 'isThumbnail'], {
    id,
    url: { type: 'string', format: 'uri' },
    caption: nullable(text),
    sortOrder: { type: 'integer', minimum: 0 },
    isThumbnail: { type: 'boolean' },
  }),
  AmenitySummary: object(['id', 'name', 'category'], {
    id,
    name: text,
    icon: nullable(text),
    category: text,
  }),
  MarketplaceRoomAmenity: object(['amenity'], { amenity: ref('AmenitySummary') }),
  MarketplaceFloor: object(['id', 'name', 'floorNumber'], {
    id,
    name: text,
    floorNumber: { type: 'integer' },
  }),
  RoomImage: object(['id', 'roomId', 'imageUrl', 'sortOrder', 'isThumbnail'], {
    id,
    roomId: id,
    imageUrl: { type: 'string', format: 'uri' },
    caption: nullable(text),
    sortOrder: { type: 'integer', minimum: 0 },
    isThumbnail: { type: 'boolean' },
    createdAt: dateTime,
  }),
  Room: object(['id', 'tenantId', 'propertyId', 'roomCode', 'title', 'status', 'marketplaceStatus', 'basePrice'], {
    id,
    tenantId: id,
    propertyId: id,
    floorId: nullable(id),
    roomCode: text,
    title: text,
    description: nullable(text),
    area: nullable(decimal),
    basePrice: decimal,
    depositAmount: nullable(decimal),
    maxOccupants: { type: 'integer', minimum: 1 },
    status: enumOf('AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE', 'INACTIVE'),
    marketplaceStatus: enumOf('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'HIDDEN'),
    property: ref('Property'),
    images: arrayOf('RoomImage'),
    ...timestamps,
  }),
  MarketplaceRoom: object(
    ['id', 'propertyId', 'roomCode', 'title', 'status', 'marketplaceStatus', 'basePrice', 'maxOccupants', 'property', 'images', 'amenities'],
    {
      id,
      propertyId: id,
      floorId: nullable(id),
      roomCode: text,
      title: text,
      description: nullable(text),
      area: nullable(decimal),
      basePrice: decimal,
      depositAmount: nullable(decimal),
      electricityPrice: nullable(decimal),
      waterPrice: nullable(decimal),
      maxOccupants: { type: 'integer', minimum: 1 },
      status: enumOf('AVAILABLE'),
      marketplaceStatus: enumOf('PUBLISHED'),
      property: ref('PublicProperty'),
      floor: nullable(ref('MarketplaceFloor')),
      images: arrayOf('MarketplaceRoomImage'),
      amenities: arrayOf('MarketplaceRoomAmenity'),
      publishedAt: nullable(dateTime),
    },
  ),
  MarketplaceRoomDetail: object(
    ['id', 'propertyId', 'roomCode', 'title', 'status', 'marketplaceStatus', 'basePrice', 'maxOccupants', 'property', 'images', 'amenities'],
    {
      id,
      propertyId: id,
      floorId: nullable(id),
      roomCode: text,
      title: text,
      description: nullable(text),
      area: nullable(decimal),
      basePrice: decimal,
      depositAmount: nullable(decimal),
      electricityPrice: nullable(decimal),
      waterPrice: nullable(decimal),
      maxOccupants: { type: 'integer', minimum: 1 },
      status: enumOf('AVAILABLE'),
      marketplaceStatus: enumOf('PUBLISHED'),
      property: ref('MarketplacePropertyDetail'),
      floor: nullable(ref('MarketplaceFloor')),
      images: arrayOf('MarketplaceRoomImage'),
      amenities: arrayOf('MarketplaceRoomAmenity'),
      publishedAt: nullable(dateTime),
    },
  ),
  MarketplaceModeration: object(['id', 'roomId', 'fromStatus', 'toStatus', 'moderatedById', 'createdAt'], {
    id,
    roomId: id,
    fromStatus: nullable(enumOf('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'HIDDEN')),
    toStatus: enumOf('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'HIDDEN'),
    reason: nullable(text),
    moderatedById: id,
    createdAt: dateTime,
  }),
  AppointmentProperty: object(['id', 'name', 'addressDetail', 'ward', 'district', 'province'], {
    id,
    name: text,
    addressDetail: text,
    ward: text,
    district: text,
    province: text,
  }),
  AppointmentRoom: object(['id', 'roomCode', 'title', 'basePrice', 'depositAmount', 'property'], {
    id,
    roomCode: text,
    title: text,
    basePrice: decimal,
    depositAmount: decimal,
    property: ref('AppointmentProperty'),
  }),
  Appointment: object(
    ['id', 'tenantId', 'roomId', 'renterId', 'scheduledAt', 'status', 'room', 'renter', 'createdAt', 'updatedAt'],
    {
      id,
      tenantId: id,
      roomId: id,
      renterId: id,
      assignedStaffId: nullable(id),
      scheduledAt: dateTime,
      status: enumOf('PENDING', 'CONFIRMED', 'REJECTED', 'RESCHEDULED', 'CANCELED', 'COMPLETED'),
      note: nullable(text),
      landlordNote: nullable(text),
      room: ref('Room'),
      renter: ref('UserSummary'),
      assignedStaff: nullable(ref('UserSummary')),
      ...timestamps,
    },
  ),
  AppointmentDetail: object(
    ['id', 'tenantId', 'roomId', 'renterId', 'scheduledAt', 'status', 'room', 'renter', 'createdAt', 'updatedAt'],
    {
      id,
      tenantId: id,
      roomId: id,
      renterId: id,
      assignedStaffId: nullable(id),
      scheduledAt: dateTime,
      status: enumOf('PENDING', 'CONFIRMED', 'REJECTED', 'RESCHEDULED', 'CANCELED', 'COMPLETED'),
      note: nullable(text),
      landlordNote: nullable(text),
      room: ref('AppointmentRoom'),
      renter: ref('UserSummary'),
      assignedStaff: nullable(ref('UserSummary')),
      ...timestamps,
    },
  ),
  RenterInvitation: object(
    ['id', 'tenantId', 'email', 'fullName', 'expiresAt', 'status', 'tenant', 'createdBy', 'createdAt', 'updatedAt'],
    {
      id,
      tenantId: id,
      email: { type: 'string', format: 'email' },
      fullName: text,
      phone: nullable(text),
      expiresAt: dateTime,
      acceptedAt: nullable(dateTime),
      acceptedUserId: nullable(id),
      revokedAt: nullable(dateTime),
      status: enumOf('ACCEPTED', 'CANCELED', 'EXPIRED', 'PENDING'),
      tenant: object(['id', 'name'], { id, name: text }),
      createdBy: ref('UserSummary'),
      createdAt: dateTime,
      updatedAt: dateTime,
    },
  ),
  RentalRequest: object(
    ['id', 'tenantId', 'roomId', 'renterId', 'expectedStartDate', 'status', 'createdAt', 'updatedAt'],
    {
      id,
      tenantId: id,
      roomId: id,
      renterId: id,
      appointmentId: nullable(id),
      expectedStartDate: date,
      message: nullable(text),
      status: enumOf('PENDING', 'APPROVED', 'REJECTED', 'NEED_MORE_INFO', 'CANCELED', 'CONVERTED_TO_CONTRACT'),
      room: ref('Room'),
      renter: ref('UserSummary'),
      appointment: nullable(ref('Appointment')),
      ...timestamps,
    },
  ),
  ContractMember: object(['id', 'userId', 'role', 'createdAt', 'user'], {
    id,
    userId: id,
    role: enumOf('MAIN_RENTER', 'CO_RENTER'),
    createdAt: dateTime,
    user: ref('UserSummary'),
  }),
  Contract: object(
    [
      'id',
      'tenantId',
      'roomId',
      'renterId',
      'contractCode',
      'status',
      'startDate',
      'endDate',
      'monthlyPrice',
      'members',
    ],
    {
      id,
      tenantId: id,
      roomId: id,
      renterId: id,
      rentalRequestId: nullable(id),
      templateId: nullable(id),
      contractCode: text,
      status: enumOf(
        'DRAFT',
        'WAITING_LANDLORD_SIGN',
        'WAITING_RENTER_SIGN',
        'ACTIVE',
        'EXPIRED',
        'TERMINATED',
        'CANCELED',
      ),
      startDate: date,
      endDate: date,
      monthlyPrice: decimal,
      depositAmount: decimal,
      billingCycle: enumOf('MONTHLY', 'QUARTERLY'),
      paymentDueDay: { type: 'integer', minimum: 1, maximum: 28 },
      contentSnapshot: nullable(text),
      room: ref('Room'),
      renter: ref('UserSummary'),
      members: arrayOf('ContractMember'),
      ...timestamps,
    },
  ),
  InvoiceItem: object(['id', 'invoiceId', 'type', 'description', 'amount'], {
    id,
    invoiceId: id,
    type: enumOf('RENT', 'ELECTRICITY', 'WATER', 'SERVICE', 'PARKING', 'INTERNET', 'PENALTY', 'DISCOUNT', 'OTHER'),
    description: text,
    quantity: decimal,
    unitPrice: decimal,
    amount: decimal,
    createdAt: dateTime,
  }),
  Debt: object(['id', 'tenantId', 'invoiceId', 'renterId', 'originalAmount', 'remainingAmount', 'status'], {
    id,
    tenantId: id,
    invoiceId: id,
    renterId: id,
    originalAmount: decimal,
    paidAmount: decimal,
    remainingAmount: decimal,
    status: enumOf('OPEN', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELED'),
    dueDate: date,
    ...timestamps,
  }),
  DebtStats: object(['totalOutstanding', 'overdueMoreThan30Days', 'overdueWithin30Days', 'currentNotDue'], {
    totalOutstanding: { type: 'number', minimum: 0 },
    overdueMoreThan30Days: { type: 'number', minimum: 0 },
    overdueWithin30Days: { type: 'number', minimum: 0 },
    currentNotDue: { type: 'number', minimum: 0 },
  }),
  DebtListResponse: object(['data', 'meta', 'stats'], {
    data: arrayOf('Debt'),
    meta: ref('PaginationMeta'),
    stats: ref('DebtStats'),
  }),
  ActionCenterRoom: object(['id', 'roomCode', 'title', 'property'], {
    id,
    roomCode: text,
    title: text,
    property: object(['id', 'name'], { id, name: text }),
  }),
  ActionCenterRentalRequest: object(['id', 'status', 'expectedStartDate', 'createdAt', 'renter', 'room'], {
    id,
    status: enumOf('PENDING'),
    expectedStartDate: date,
    createdAt: dateTime,
    renter: object(['id', 'fullName'], { id, fullName: text }),
    room: ref('ActionCenterRoom'),
  }),
  ActionCenterContract: object(['id', 'contractCode', 'status', 'endDate', 'renter', 'room'], {
    id,
    contractCode: text,
    status: enumOf('ACTIVE'),
    endDate: date,
    renter: object(['id', 'fullName'], { id, fullName: text }),
    room: ref('ActionCenterRoom'),
  }),
  ActionCenterInvoice: object(
    ['id', 'invoiceCode', 'status', 'dueDate', 'debtAmount', 'daysOverdue', 'renter', 'room'],
    {
      id,
      invoiceCode: text,
      status: enumOf('UNPAID', 'PARTIALLY_PAID', 'OVERDUE'),
      dueDate: date,
      debtAmount: { type: 'number', minimum: 0 },
      daysOverdue: count,
      renter: object(['id', 'fullName'], { id, fullName: text }),
      room: ref('ActionCenterRoom'),
    },
  ),
  ActionCenterTicket: object(['id', 'title', 'priority', 'status', 'createdAt', 'room'], {
    id,
    title: text,
    priority: enumOf('LOW', 'MEDIUM', 'HIGH', 'URGENT'),
    status: enumOf('OPEN', 'IN_PROGRESS', 'WAITING_RENTER'),
    createdAt: dateTime,
    createdBy: nullable(object(['id', 'fullName'], { id, fullName: text })),
    room: ref('ActionCenterRoom'),
  }),
  ActionCenterResponse: object(['tenantId', 'pendingRequests', 'expiringContracts', 'unpaidInvoices', 'openTickets'], {
    tenantId: id,
    pendingRequests: object(['total', 'items'], {
      total: count,
      items: arrayOf('ActionCenterRentalRequest'),
    }),
    expiringContracts: object(['total', 'items'], {
      total: count,
      items: arrayOf('ActionCenterContract'),
    }),
    unpaidInvoices: object(['total', 'items'], {
      total: count,
      items: arrayOf('ActionCenterInvoice'),
    }),
    openTickets: object(['total', 'items'], {
      total: count,
      items: arrayOf('ActionCenterTicket'),
    }),
  }),
  Invoice: object(
    ['id', 'tenantId', 'contractId', 'renterId', 'invoiceCode', 'status', 'totalAmount', 'paidAmount', 'debtAmount'],
    {
      id,
      tenantId: id,
      contractId: id,
      renterId: id,
      roomId: id,
      invoiceCode: text,
      billingMonth: date,
      issueDate: date,
      dueDate: date,
      status: enumOf('DRAFT', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELED'),
      subtotal: decimal,
      discountAmount: decimal,
      penaltyAmount: decimal,
      totalAmount: decimal,
      paidAmount: decimal,
      debtAmount: decimal,
      note: nullable(text),
      items: arrayOf('InvoiceItem'),
      debt: nullable(ref('Debt')),
      ...timestamps,
    },
  ),
  PaymentQrCode: object(['id', 'tenantId', 'invoiceId', 'amount', 'status', 'expiresAt'], {
    id,
    tenantId: id,
    invoiceId: id,
    amount: decimal,
    status: enumOf('ACTIVE', 'EXPIRED', 'PAID', 'CANCELED'),
    qrCode: text,
    checkoutUrl: nullable({ type: 'string', format: 'uri' }),
    providerReference: nullable(text),
    expiresAt: dateTime,
    ...timestamps,
  }),
  Payment: object(['id', 'tenantId', 'invoiceId', 'payerId', 'amount', 'method', 'status'], {
    id,
    tenantId: id,
    invoiceId: id,
    payerId: id,
    amount: decimal,
    method: enumOf('CASH', 'BANK_TRANSFER', 'QR', 'WALLET'),
    status: enumOf('PENDING', 'SUCCESS', 'FAILED', 'CANCELED', 'REFUNDED'),
    transactionCode: nullable(text),
    evidenceUrl: nullable({ type: 'string', format: 'uri' }),
    renterNote: nullable(text),
    landlordNote: nullable(text),
    paidAt: nullable(dateTime),
    approvedAt: nullable(dateTime),
    rejectedAt: nullable(dateTime),
    invoice: ref('Invoice'),
    ...timestamps,
  }),
  TicketUser: object(['id', 'fullName'], {
    id,
    fullName: text,
    email: text,
    phone: nullable(text),
  }),
  TicketRoom: object(['id', 'roomCode', 'title', 'property'], {
    id,
    roomCode: text,
    title: text,
    property: object(['id', 'name'], { id, name: text }),
  }),
  TicketContract: object(['id', 'contractCode', 'status', 'renterId'], {
    id,
    contractCode: text,
    status: text,
    renterId: id,
  }),
  TicketComment: object(['id', 'ticketId', 'userId', 'message', 'isInternal', 'createdAt', 'user'], {
    id,
    ticketId: id,
    userId: id,
    message: text,
    isInternal: { type: 'boolean' },
    user: ref('TicketUser'),
    createdAt: dateTime,
  }),
  TicketAttachment: object(['id', 'ticketId', 'fileUrl', 'fileType', 'uploadedBy', 'createdAt', 'uploadedByUser'], {
    id,
    ticketId: id,
    fileUrl: { type: 'string', format: 'uri' },
    fileType: text,
    uploadedBy: id,
    uploadedByUser: ref('TicketUser'),
    createdAt: dateTime,
  }),
  TicketHistoryStaff: object(['id', 'action', 'oldValues', 'newValues', 'createdAt', 'actor'], {
    id,
    action: text,
    oldValues: nullable(jsonValue),
    newValues: nullable(jsonValue),
    createdAt: dateTime,
    actor: nullable(ref('TicketUser')),
  }),
  TicketHistoryRenter: object(['id', 'action', 'transition', 'actorDisplayName', 'createdAt'], {
    id,
    action: text,
    transition: object(['oldValues', 'newValues'], {
      oldValues: nullable(jsonValue),
      newValues: nullable(jsonValue),
    }),
    actorDisplayName: text,
    createdAt: dateTime,
  }),
  TicketSummary: object(
    [
      'id',
      'tenantId',
      'roomId',
      'contractId',
      'assignedTo',
      'title',
      'category',
      'priority',
      'status',
      'createdAt',
      'updatedAt',
      'resolvedAt',
      'createdById',
      'updatedById',
      'room',
      'contract',
      'assignedToUser',
      'createdBy',
      'commentCount',
      'attachmentCount',
    ],
    {
      id,
      tenantId: id,
      roomId: id,
      contractId: nullable(id),
      createdById: id,
      updatedById: nullable(id),
      assignedTo: nullable(id),
      title: text,
      category: enumOf('ELECTRICITY', 'WATER', 'INTERNET', 'FURNITURE', 'SECURITY', 'CLEANING', 'OTHER'),
      priority: enumOf('LOW', 'MEDIUM', 'HIGH', 'URGENT'),
      status: enumOf('OPEN', 'IN_PROGRESS', 'WAITING_RENTER', 'RESOLVED', 'CLOSED', 'CANCELED'),
      resolvedAt: nullable(dateTime),
      room: ref('TicketRoom'),
      contract: nullable(ref('TicketContract')),
      assignedToUser: nullable(ref('TicketUser')),
      createdBy: ref('TicketUser'),
      commentCount: count,
      attachmentCount: count,
      ...timestamps,
    },
  ),
  TicketDetail: {
    allOf: [ref('TicketSummary'), object(['description'], { description: text })],
  },
  Notification: object(['id', 'userId', 'title', 'content', 'type', 'data', 'isRead', 'createdAt'], {
    id,
    userId: id,
    tenantId: nullable(id),
    title: text,
    content: text,
    type: enumOf(
      'INVOICE',
      'PAYMENT',
      'CONTRACT',
      'TICKET',
      'APPOINTMENT',
      'REVIEW',
      'REPORT',
      'MARKETPLACE',
      'RENTAL_REQUEST',
      'SYSTEM',
    ),
    data: jsonValue,
    isRead: { type: 'boolean' },
    readAt: nullable(dateTime),
    createdAt: dateTime,
  }),
  DeviceToken: object(['id', 'userId', 'token', 'platform', 'isActive', 'lastSeenAt', 'createdAt', 'updatedAt'], {
    id,
    userId: id,
    token: text,
    fid: nullable(text),
    platform: enumOf('IOS', 'ANDROID', 'WEB'),
    deviceName: nullable(text),
    isActive: { type: 'boolean' },
    failureCount: count,
    lastError: nullable(text),
    disabledAt: nullable(dateTime),
    lastSeenAt: nullable(dateTime),
    createdAt: dateTime,
    updatedAt: dateTime,
  }),
  Review: object(['id', 'roomId', 'reviewerId', 'rating', 'comment', 'createdAt'], {
    id,
    roomId: id,
    reviewerId: id,
    rating: { type: 'integer', minimum: 1, maximum: 5 },
    comment: nullable(text),
    createdAt: dateTime,
  }),
  ReviewSummary: object(['roomId', 'averageRating', 'totalReviews'], {
    roomId: id,
    averageRating: { type: 'number', minimum: 0, maximum: 5 },
    totalReviews: count,
  }),
  RoomAsset: object(['id', 'tenantId', 'roomId', 'name', 'condition'], {
    id,
    tenantId: id,
    roomId: id,
    name: text,
    condition: enumOf('NEW', 'GOOD', 'NORMAL', 'DAMAGED', 'LOST'),
    quantity: { type: 'integer', minimum: 0 },
    description: nullable(text),
    ...timestamps,
  }),
}

export function isFePriorityOperation(path: string) {
  return FE_PRIORITY_PATH.test(path)
}

export function feSuccessResponseSchema(method: string, path: string): Schema {
  if (path === '/auth/login') return { oneOf: [ref('OTPRequiredResponse'), ref('TokenPair')] }
  if (['/auth/refresh-token', '/auth/google/session'].includes(path)) return ref('TokenPair')
  if (path === '/auth/google/url') return ref('UrlResponse')
  if (path === '/auth/profile') return ref('UserProfile')
  if (path === '/auth/google/callback') return { type: 'string', description: 'OAuth redirect response' }
  if (path === '/auth/send-otp') return ref('OTPRequiredResponse')
  if (path.startsWith('/auth/')) return path === '/auth/register' ? ref('UserProfile') : ref('MessageResponse')

  if (path === '/marketplace/rooms' && method === 'get') return paginated('MarketplaceRoom')
  if (path === '/marketplace/amenities' && method === 'get') return paginated('AmenitySummary')
  if (/^\/marketplace\/rooms\/\{id\}$/.test(path)) return ref('MarketplaceRoomDetail')
  if (path.endsWith('/rental-requests')) return ref('RentalRequest')
  if (path.endsWith('/viewing-appointments')) return ref('Appointment')
  if (path === '/marketplace/admin/rooms' && method === 'get') return paginated('Room')
  if (path.endsWith('/history')) {
    if (path.startsWith('/marketplace/admin/')) return paginated('MarketplaceModeration')
    if (path.startsWith('/tickets/'))
      return paginated(path.startsWith('/tickets/me/') ? 'TicketHistoryRenter' : 'TicketHistoryStaff')
  }
  if (path.startsWith('/marketplace/admin/')) return ref('Room')
  if (path.endsWith('/reviews')) return paginated('Review')
  if (path.endsWith('/review-summary')) return ref('ReviewSummary')
  if (path === '/renters/invitations/{id}') return ref('RenterInvitation')
  if (path === '/dashboard/action-center') return ref('ActionCenterResponse')

  if (path.startsWith('/rental-requests')) {
    return method === 'get' && (path === '/rental-requests' || path === '/rental-requests/me')
      ? paginated('RentalRequest')
      : ref('RentalRequest')
  }
  if (path.startsWith('/room-viewing-appointments')) {
    if (path === '/room-viewing-appointments/{id}' && method === 'get') return ref('AppointmentDetail')
    return method === 'get' && ['/room-viewing-appointments', '/room-viewing-appointments/me'].includes(path)
      ? paginated('Appointment')
      : ref('Appointment')
  }
  if (path.startsWith('/properties')) {
    if (path.endsWith('/floors') && method === 'get') return { type: 'array', items: ref('Floor') }
    if (path.includes('/floors')) return ref('Floor')
    return path === '/properties' && method === 'get' ? paginated('Property') : ref('Property')
  }
  if (path.startsWith('/rooms/') && path.endsWith('/assets')) {
    return method === 'get' ? { type: 'array', items: ref('RoomAsset') } : ref('RoomAsset')
  }
  if (path.startsWith('/rooms')) {
    if (path === '/rooms' && method === 'get') return paginated('Room')
    if (path.endsWith('/images') && method === 'post') return ref('RoomImage')
    return ref('Room')
  }
  if (path.startsWith('/contracts')) {
    return method === 'get' && ['/contracts', '/contracts/me'].includes(path) ? paginated('Contract') : ref('Contract')
  }
  if (path.startsWith('/invoices')) {
    if (path.includes('/payment-qr')) return ref('PaymentQrCode')
    if (path.includes('/payment-confirmations')) return ref('Payment')
    if (method === 'get' && ['/invoices', '/invoices/me'].includes(path)) return paginated('Invoice')
    if (method === 'get' && ['/invoices/debts', '/invoices/debts/me'].includes(path)) return ref('DebtListResponse')
    return ref('Invoice')
  }
  if (path.startsWith('/payments')) {
    return method === 'get' && ['/payments', '/payments/me'].includes(path) ? paginated('Payment') : ref('Payment')
  }
  if (path.startsWith('/tickets')) {
    if (method === 'get' && ['/tickets', '/tickets/me'].includes(path)) return paginated('TicketSummary')
    if (path.endsWith('/comments')) return method === 'get' ? paginated('TicketComment') : ref('TicketComment')
    if (path.endsWith('/attachments') || path.endsWith('/attachments/upload')) {
      return method === 'get' ? paginated('TicketAttachment') : ref('TicketAttachment')
    }
    return ref('TicketDetail')
  }
  if (path === '/notifications' && method === 'get') return paginated('Notification')
  if (path === '/notifications/unread-count') return { type: 'integer', minimum: 0 }
  if (path === '/notifications/read-all') return ref('UnreadCount')
  if (path.startsWith('/notifications/')) return ref('Notification')
  if (path.startsWith('/device-tokens')) return ref('DeviceToken')
  return object([], {})
}

export function addFePrioritySchemas(document: OpenAPIObject) {
  document.components ??= {}
  document.components.schemas = {
    ...document.components.schemas,
    ...FE_PRIORITY_COMPONENTS,
  }
}

function paginated(itemName: string): Schema {
  return object(['data', 'meta'], { data: arrayOf(itemName), meta: ref('PaginationMeta') })
}
