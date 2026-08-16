import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { buildPaginatedResult, normalizePagination } from '@src/common/utils/pagination.util'
import { NotificationEventsService } from '@src/modules/notifications/notification-events.service'
import { TenantAccessService } from '@src/shared/modules/services/tenant-access.service'
import type { DebtStatus, InvoiceItemType, InvoiceStatus, Prisma } from 'generated/prisma/client'
import type {
  TCreateInvoiceBodySchema,
  TExtraInvoiceItemSchema,
  TListDebtsQuerySchema,
  TListInvoicesQuerySchema,
  TUpdateInvoiceBodySchema,
} from './model/invoices.model'
import { InvoicesRepository, type InvoiceItemDraft, type InvoiceTotals } from './repositories/invoices.repo'

/**
 * Service for monthly invoices and the debt ledger generated from them.
 */
@Injectable()
export class InvoicesService {
  constructor(
    private readonly invoicesRepository: InvoicesRepository,
    private readonly tenantAccessService: TenantAccessService,
    private readonly notificationEventsService: NotificationEventsService,
  ) {}

  async listForLandlord(userId: number, query: TListInvoicesQuerySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const { page, limit, skip } = normalizePagination(query)
    const where = this.buildInvoiceWhere(tenant.tenantId, query)
    const [invoices, total] = await this.invoicesRepository.findInvoicesAndCount(where, skip, limit)
    return buildPaginatedResult(invoices, total, page, limit)
  }

  async listDebts(userId: number, query: TListDebtsQuerySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const { page, limit, skip } = normalizePagination(query)
    const where = this.buildDebtWhere(tenant.tenantId, query)
    const statsWhere = this.buildDebtWhere(tenant.tenantId, { ...query, status: undefined })
    return this.listDebtsWithStats(where, statsWhere, page, limit, skip)
  }

  async listMyDebts(userId: number, query: TListDebtsQuerySchema) {
    const { page, limit, skip } = normalizePagination(query)
    const where = this.buildDebtWhereForRenter(userId, query)
    const statsWhere = this.buildDebtWhereForRenter(userId, { ...query, status: undefined })
    return this.listDebtsWithStats(where, statsWhere, page, limit, skip)
  }

  async getForLandlord(userId: number, id: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    return this.getTenantInvoiceOrThrow(tenant.tenantId, id)
  }

  async listMine(userId: number, query: TListInvoicesQuerySchema) {
    const { page, limit, skip } = normalizePagination(query)
    const where = this.buildInvoiceWhereForRenter(userId, query)
    const [invoices, total] = await this.invoicesRepository.findInvoicesAndCount(where, skip, limit)
    return buildPaginatedResult(invoices, total, page, limit)
  }

  async getMine(userId: number, id: number) {
    const invoice = await this.invoicesRepository.findMyInvoice(userId, id)
    if (!invoice) {
      throw new NotFoundException('Không tìm thấy hóa đơn của bạn')
    }
    return invoice
  }

  async create(userId: number, body: TCreateInvoiceBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const billingMonth = this.normalizeBillingMonth(body.billingMonth)
    const monthEnd = this.endOfBillingMonth(billingMonth)
    const contract = await this.invoicesRepository.findActiveContractForInvoice(
      tenant.tenantId,
      body.contractId,
      billingMonth,
      monthEnd,
    )
    if (!contract || contract.room.deletedAt) {
      throw new NotFoundException('Không tìm thấy hợp đồng active thuộc tenant trong kỳ hóa đơn')
    }

    const existingInvoice = await this.invoicesRepository.findExistingInvoiceForContractMonth(contract.id, billingMonth)
    if (existingInvoice) {
      throw new ConflictException('Hợp đồng đã có hóa đơn cho tháng này')
    }

    const readings = await this.invoicesRepository.findConfirmedReadingsForInvoice(
      tenant.tenantId,
      contract.id,
      contract.roomId,
      billingMonth,
    )
    const serviceAssignments = await this.invoicesRepository.findServiceAssignmentsForInvoice(
      tenant.tenantId,
      contract.id,
      contract.roomId,
      billingMonth,
      monthEnd,
    )
    const items = this.buildInvoiceItems(contract, billingMonth, readings, serviceAssignments, body.extraItems)
    const totals = this.calculateTotals(items)
    const issueDate = body.issueDate ? this.normalizeDateOnly(body.issueDate) : this.todayDateOnly()
    const dueDate = body.dueDate
      ? this.normalizeDateOnly(body.dueDate)
      : this.defaultDueDate(billingMonth, contract.paymentDueDay, issueDate)
    this.assertDueDateValid(issueDate, dueDate)
    const invoiceCode = await this.generateInvoiceCode(tenant.tenantId, billingMonth)

    const invoice = await this.invoicesRepository.createInvoiceWithItemsAndDebt(
      {
        tenantId: tenant.tenantId,
        contractId: contract.id,
        roomId: contract.roomId,
        renterId: contract.renterId,
        invoiceCode,
        billingMonth,
        issueDate,
        dueDate,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        penaltyAmount: totals.penaltyAmount,
        totalAmount: totals.totalAmount,
        paidAmount: 0,
        debtAmount: totals.totalAmount,
        status: body.status,
        note: body.note ?? null,
        createdById: userId,
        updatedById: userId,
      },
      items,
      this.toDebtStatus(body.status, totals.totalAmount),
    )
    if (invoice.status === 'UNPAID') {
      await this.notificationEventsService.notifyInvoiceIssued(invoice)
    }
    return invoice
  }

  async generateMonthlyInvoices() {
    const today = new Date()
    // Define the billing month as the current month
    const billingMonth = this.normalizeBillingMonth(today)
    const monthEnd = this.endOfBillingMonth(billingMonth)

    const contracts = await this.invoicesRepository.findActiveContractsForInvoiceGeneration(billingMonth, monthEnd)
    let successCount = 0
    let errorCount = 0

    for (const contract of contracts) {
      if (contract.room.deletedAt) continue

      try {
        const readings = await this.invoicesRepository.findConfirmedReadingsForInvoice(
          contract.tenantId,
          contract.id,
          contract.roomId,
          billingMonth,
        )
        const serviceAssignments = await this.invoicesRepository.findServiceAssignmentsForInvoice(
          contract.tenantId,
          contract.id,
          contract.roomId,
          billingMonth,
          monthEnd,
        )

        const items = this.buildInvoiceItems(contract, billingMonth, readings, serviceAssignments, [])
        const totals = this.calculateTotals(items)
        const issueDate = this.todayDateOnly()
        const dueDate = this.defaultDueDate(billingMonth, contract.paymentDueDay, issueDate)
        const invoiceCode = await this.generateInvoiceCode(contract.tenantId, billingMonth)

        // For automated invoice generation, we set it as DRAFT and let landlord issue it,
        // or we could issue it directly. Typically, monthly invoices are generated as DRAFT for review.
        await this.invoicesRepository.createInvoiceWithItemsAndDebt(
          {
            tenantId: contract.tenantId,
            contractId: contract.id,
            roomId: contract.roomId,
            renterId: contract.renterId,
            invoiceCode,
            billingMonth,
            issueDate,
            dueDate,
            subtotal: totals.subtotal,
            discountAmount: totals.discountAmount,
            penaltyAmount: totals.penaltyAmount,
            totalAmount: totals.totalAmount,
            paidAmount: 0,
            debtAmount: totals.totalAmount,
            status: 'DRAFT',
            note: 'Hóa đơn tự động sinh bởi hệ thống',
            createdById: 1, // Assuming user 1 is system admin
            updatedById: 1,
          },
          items,
          this.toDebtStatus('DRAFT', totals.totalAmount),
        )
        successCount++
      } catch (error) {
        errorCount++
        console.error(`Failed to generate invoice for contract ${contract.id}`, error)
      }
    }

    return { successCount, errorCount }
  }

  async updateDraft(userId: number, id: number, body: TUpdateInvoiceBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const invoice = await this.getTenantInvoiceOrThrow(tenant.tenantId, id)
    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException('Chỉ hóa đơn nháp mới được chỉnh sửa')
    }

    const extraItems = body.extraItems ?? this.extractExtraItems(invoice.items)
    const items = this.rebuildDraftItems(invoice, extraItems)
    const totals = this.calculateTotals(items)
    const issueDate = body.issueDate
      ? this.normalizeDateOnly(body.issueDate)
      : this.normalizeDateOnly(invoice.issueDate)
    const dueDate = body.dueDate ? this.normalizeDateOnly(body.dueDate) : this.normalizeDateOnly(invoice.dueDate)
    this.assertDueDateValid(issueDate, dueDate)

    return this.invoicesRepository.updateDraftInvoiceWithDebt(
      id,
      {
        issueDate,
        dueDate,
        note: body.note === undefined ? undefined : (body.note ?? null),
        updatedById: userId,
      },
      items,
      { ...totals, paidAmount: 0, debtAmount: totals.totalAmount },
    )
  }

  async issue(userId: number, id: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const invoice = await this.getTenantInvoiceOrThrow(tenant.tenantId, id)
    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException('Chỉ hóa đơn nháp mới được phát hành')
    }
    const updated = await this.invoicesRepository.updateInvoiceAndDebtStatus(id, 'UNPAID', 'OPEN', userId)
    await this.notificationEventsService.notifyInvoiceIssued(updated)
    return updated
  }

  async cancel(userId: number, id: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const invoice = await this.getTenantInvoiceOrThrow(tenant.tenantId, id)
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Không thể hủy hóa đơn đã thanh toán')
    }
    const successfulPayments = await this.invoicesRepository.countSuccessfulPayments(id)
    if (successfulPayments > 0) {
      throw new BadRequestException('Hóa đơn đã có thanh toán thành công, không thể hủy')
    }
    return this.invoicesRepository.updateInvoiceAndDebtStatus(id, 'CANCELED', 'CANCELED', userId)
  }

  async markOverdue(userId: number, id: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const invoice = await this.getTenantInvoiceOrThrow(tenant.tenantId, id)
    if (!['UNPAID', 'PARTIALLY_PAID'].includes(invoice.status)) {
      throw new BadRequestException('Chỉ hóa đơn còn nợ mới có thể chuyển quá hạn')
    }
    if (Number(invoice.debtAmount) <= 0) {
      throw new BadRequestException('Hóa đơn không còn công nợ')
    }
    if (this.normalizeDateOnly(invoice.dueDate).getTime() >= this.todayDateOnly().getTime()) {
      throw new BadRequestException('Hóa đơn chưa đến hạn quá hạn')
    }
    const updated = await this.invoicesRepository.updateInvoiceAndDebtStatus(id, 'OVERDUE', 'OVERDUE', userId)
    await this.notificationEventsService.notifyInvoiceOverdue(updated)
    return updated
  }

  private async getTenantInvoiceOrThrow(tenantId: number, id: number) {
    const invoice = await this.invoicesRepository.findTenantInvoice(tenantId, id)
    if (!invoice) {
      throw new NotFoundException('Không tìm thấy hóa đơn trong tenant hiện tại')
    }
    return invoice
  }

  private async listDebtsWithStats(
    where: Prisma.DebtWhereInput,
    statsWhere: Prisma.DebtWhereInput,
    page: number,
    limit: number,
    skip: number,
  ) {
    const today = this.todayDateOnly()
    const [[debts, total], stats] = await Promise.all([
      this.invoicesRepository.findDebtsAndCount(where, skip, limit),
      this.invoicesRepository.getDebtStats(statsWhere, today),
    ])
    return {
      ...buildPaginatedResult(debts, total, page, limit),
      stats: {
        totalOutstanding: this.toNumber(stats.totalOutstanding),
        overdueMoreThan30Days: this.toNumber(stats.overdueMoreThan30Days),
        overdueWithin30Days: this.toNumber(stats.overdueWithin30Days),
        currentNotDue: this.toNumber(stats.currentNotDue),
      },
    }
  }

  /**
   * Builds rent, confirmed utility readings and extra fee lines before totals are snapshotted.
   */
  private buildInvoiceItems(
    contract: { room: { roomCode: string }; monthlyPrice: unknown },
    billingMonth: Date,
    readings: Array<{
      id: number
      consumption: unknown
      unitPrice: unknown
      amount: unknown
      previousValue: unknown
      currentValue: unknown
      meter: { type: 'ELECTRICITY' | 'WATER'; unit: string }
    }>,
    serviceAssignments: Array<{
      quantity: unknown
      unitPrice: unknown
      serviceItem: {
        name: string
        itemType: InvoiceItemType
        defaultUnitPrice: unknown
        unitLabel: string
      }
    }>,
    extraItems: TExtraInvoiceItemSchema[],
  ): InvoiceItemDraft[] {
    const monthLabel = this.formatBillingMonth(billingMonth)
    const rent: InvoiceItemDraft = {
      itemType: 'RENT',
      description: `Tiền thuê phòng ${contract.room.roomCode} tháng ${monthLabel}`,
      quantity: 1,
      unitPrice: this.toNumber(contract.monthlyPrice),
      amount: this.toNumber(contract.monthlyPrice),
      meterReadingId: null,
    }
    const utilityItems = readings.map((reading) => this.utilityReadingToItem(reading, monthLabel))
    const serviceItems: InvoiceItemDraft[] = serviceAssignments.map((assignment) => {
      const quantity = this.toNumber(assignment.quantity)
      const unitPrice = this.toNumber(assignment.unitPrice ?? assignment.serviceItem.defaultUnitPrice)
      return {
        itemType: assignment.serviceItem.itemType,
        description: `${assignment.serviceItem.name} (${assignment.serviceItem.unitLabel}) tháng ${monthLabel}`,
        quantity,
        unitPrice,
        amount: quantity * unitPrice,
        meterReadingId: null,
      }
    })
    return [rent, ...utilityItems, ...serviceItems, ...this.extraItemsToInvoiceItems(extraItems)]
  }

  private rebuildDraftItems(invoice: { items: unknown[]; billingMonth: Date }, extraItems: TExtraInvoiceItemSchema[]) {
    const fixedItems = (invoice.items as Array<Record<string, unknown>>)
      .filter((item) => ['RENT', 'ELECTRICITY', 'WATER'].includes(String(item.itemType)))
      .map((item) => this.itemFromExisting(item))
    return [...fixedItems, ...this.extraItemsToInvoiceItems(extraItems)]
  }

  private utilityReadingToItem(
    reading: {
      id: number
      consumption: unknown
      unitPrice: unknown
      amount: unknown
      previousValue: unknown
      currentValue: unknown
      meter: { type: 'ELECTRICITY' | 'WATER'; unit: string }
    },
    monthLabel: string,
  ): InvoiceItemDraft {
    const type = reading.meter.type
    const label = type === 'ELECTRICITY' ? 'Tiền điện' : 'Tiền nước'
    return {
      itemType: type,
      description: `${label} tháng ${monthLabel} (${this.toNumber(reading.previousValue)} - ${this.toNumber(reading.currentValue)} ${reading.meter.unit})`,
      quantity: this.toNumber(reading.consumption),
      unitPrice: this.toNumber(reading.unitPrice),
      amount: this.toNumber(reading.amount),
      meterReadingId: reading.id,
    }
  }

  private extraItemsToInvoiceItems(items: TExtraInvoiceItemSchema[]): InvoiceItemDraft[] {
    return items.map((item) => ({
      itemType: item.itemType,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.quantity * item.unitPrice,
      meterReadingId: null,
    }))
  }

  private extractExtraItems(items: unknown[]): TExtraInvoiceItemSchema[] {
    return (items as Array<Record<string, unknown>>)
      .filter((item) => !['RENT', 'ELECTRICITY', 'WATER'].includes(String(item.itemType)))
      .map((item) => ({
        itemType: item.itemType as TExtraInvoiceItemSchema['itemType'],
        description: String(item.description),
        quantity: this.toNumber(item.quantity),
        unitPrice: this.toNumber(item.unitPrice),
      }))
  }

  private itemFromExisting(item: Record<string, unknown>): InvoiceItemDraft {
    return {
      itemType: item.itemType as InvoiceItemType,
      description: String(item.description),
      quantity: this.toNumber(item.quantity),
      unitPrice: this.toNumber(item.unitPrice),
      amount: this.toNumber(item.amount),
      meterReadingId: item.meterReadingId ? Number(item.meterReadingId) : null,
    }
  }

  private calculateTotals(items: InvoiceItemDraft[]): InvoiceTotals {
    const subtotal = items
      .filter((item) => item.itemType !== 'PENALTY' && item.itemType !== 'DISCOUNT')
      .reduce((sum, item) => sum + item.amount, 0)
    const penaltyAmount = items
      .filter((item) => item.itemType === 'PENALTY')
      .reduce((sum, item) => sum + item.amount, 0)
    const discountAmount = items
      .filter((item) => item.itemType === 'DISCOUNT')
      .reduce((sum, item) => sum + item.amount, 0)
    const totalAmount = Math.max(0, subtotal + penaltyAmount - discountAmount)
    return { subtotal, discountAmount, penaltyAmount, totalAmount, paidAmount: 0, debtAmount: totalAmount }
  }

  private toDebtStatus(status: InvoiceStatus, remainingAmount: number): DebtStatus {
    if (status === 'CANCELED') return 'CANCELED'
    if (remainingAmount <= 0 || status === 'PAID') return 'PAID'
    if (status === 'PARTIALLY_PAID') return 'PARTIAL'
    if (status === 'OVERDUE') return 'OVERDUE'
    return 'OPEN'
  }

  private async generateInvoiceCode(tenantId: number, billingMonth: Date) {
    const yyyy = billingMonth.getUTCFullYear()
    const mm = String(billingMonth.getUTCMonth() + 1).padStart(2, '0')
    for (let attempt = 0; attempt < 10; attempt++) {
      const suffix = Math.random().toString(36).slice(2, 8).toUpperCase()
      const code = `INV-${tenantId}-${yyyy}${mm}-${suffix}`
      if (!(await this.invoicesRepository.isInvoiceCodeTaken(code))) {
        return code
      }
    }
    throw new ConflictException('Không thể sinh mã hóa đơn duy nhất')
  }

  private normalizeBillingMonth(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
  }

  private endOfBillingMonth(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))
  }

  private normalizeDateOnly(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  }

  private todayDateOnly() {
    return this.normalizeDateOnly(new Date())
  }

  private defaultDueDate(billingMonth: Date, paymentDueDay: number, issueDate: Date) {
    const contractDueDate = new Date(
      Date.UTC(billingMonth.getUTCFullYear(), billingMonth.getUTCMonth(), Math.min(28, paymentDueDay)),
    )
    return contractDueDate.getTime() < issueDate.getTime() ? issueDate : contractDueDate
  }

  private assertDueDateValid(issueDate: Date, dueDate: Date) {
    if (dueDate.getTime() < issueDate.getTime()) {
      throw new BadRequestException('Ngày đến hạn không được trước ngày phát hành')
    }
  }

  private formatBillingMonth(date: Date) {
    return `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`
  }

  private toNumber(value: unknown) {
    return Number(value)
  }

  private buildInvoiceWhere(tenantId: number, query: TListInvoicesQuerySchema): Prisma.InvoiceWhereInput {
    const billingMonth = query.billingMonth ? this.normalizeBillingMonth(query.billingMonth) : undefined
    const from = query.from ? this.normalizeBillingMonth(query.from) : undefined
    const to = query.to ? this.normalizeBillingMonth(query.to) : undefined
    return {
      tenantId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(billingMonth ? { billingMonth } : {}),
      ...(!billingMonth && (from || to)
        ? { billingMonth: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {}),
      ...(query.roomId ? { roomId: query.roomId } : {}),
      ...(query.contractId ? { contractId: query.contractId } : {}),
      ...(query.renterId ? { renterId: query.renterId } : {}),
      ...(query.propertyId ? { room: { propertyId: query.propertyId } } : {}),
      ...(query.search
        ? {
            OR: [
              { invoiceCode: { contains: query.search, mode: 'insensitive' } },
              { renter: { fullName: { contains: query.search, mode: 'insensitive' } } },
              { renter: { email: { contains: query.search, mode: 'insensitive' } } },
              { room: { roomCode: { contains: query.search, mode: 'insensitive' } } },
              { room: { title: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }
  }

  private buildDebtWhere(tenantId: number, query: TListDebtsQuerySchema): Prisma.DebtWhereInput {
    const billingMonth = query.billingMonth ? this.normalizeBillingMonth(query.billingMonth) : undefined
    const from = query.from ? this.normalizeBillingMonth(query.from) : undefined
    const to = query.to ? this.normalizeBillingMonth(query.to) : undefined
    return {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(billingMonth ? { billingMonth } : {}),
      ...(!billingMonth && (from || to)
        ? { billingMonth: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {}),
      ...(query.roomId ? { roomId: query.roomId } : {}),
      ...(query.contractId ? { contractId: query.contractId } : {}),
      ...(query.renterId ? { renterId: query.renterId } : {}),
      ...(query.propertyId ? { room: { propertyId: query.propertyId } } : {}),
      ...(query.search
        ? {
            OR: [
              { invoice: { invoiceCode: { contains: query.search, mode: 'insensitive' } } },
              { renter: { fullName: { contains: query.search, mode: 'insensitive' } } },
              { renter: { email: { contains: query.search, mode: 'insensitive' } } },
              { room: { roomCode: { contains: query.search, mode: 'insensitive' } } },
              { room: { title: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }
  }

  private buildInvoiceWhereForRenter(userId: number, query: TListInvoicesQuerySchema): Prisma.InvoiceWhereInput {
    const where = this.buildInvoiceWhere(0, { ...query, renterId: undefined })
    return { ...where, tenantId: undefined, renterId: userId }
  }

  private buildDebtWhereForRenter(userId: number, query: TListDebtsQuerySchema): Prisma.DebtWhereInput {
    const where = this.buildDebtWhere(0, { ...query, renterId: undefined })
    return { ...where, tenantId: undefined, renterId: userId }
  }
}
