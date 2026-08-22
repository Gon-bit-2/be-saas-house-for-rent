import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { ContextIdFactory, ModuleRef } from '@nestjs/core'
import { InvoicesService } from './invoices.service'

@Injectable()
export class InvoicesScheduler {
  private readonly logger = new Logger(InvoicesScheduler.name)

  constructor(private moduleRef: ModuleRef) {}

  // Run on the 28th of every month at 01:00 AM
  @Cron('0 1 28 * *')
  async handleMonthlyInvoiceGeneration() {
    this.logger.log('Starting automated monthly invoice generation...')
    try {
      const contextId = ContextIdFactory.create()
      // Register a mock request object for request-scoped dependencies (e.g. TenantAccessService)
      this.moduleRef.registerRequestByContextId({ user: { contextKind: 'SYSTEM' } }, contextId)

      const invoicesService = await this.moduleRef.resolve(InvoicesService, contextId)
      const result = await invoicesService.generateMonthlyInvoices()

      this.logger.log(`Completed invoice generation. Success: ${result.successCount}, Errors: ${result.errorCount}`)
    } catch (error) {
      this.logger.error('Error during automated monthly invoice generation', error)
    }
  }
}
