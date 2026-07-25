import { PrismaPg } from '@prisma/adapter-pg'
import envConfig from '@src/config/env.config'
import { digestWebhookPayload, sanitizePayosWebhookPayload } from '@src/modules/payments/webhook-log.security'
import { PrismaClient } from 'generated/prisma/client'
import { Pool } from 'pg'

async function main() {
  const pool = new Pool({ connectionString: envConfig.DATABASE_URL, max: 2 })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
  const cutoff = new Date(Date.now() - envConfig.PAYMENT_WEBHOOK_RETENTION_DAYS * 24 * 60 * 60_000)
  const batchSize = envConfig.PAYMENT_WEBHOOK_RETENTION_BATCH_SIZE

  try {
    const [preflight] = await prisma.$queryRaw<Array<{ sensitive: bigint; expired: bigint }>>`
      SELECT
        COUNT(*) FILTER (
          WHERE payload ? 'signature'
             OR payload #> '{data,accountNumber}' IS NOT NULL
             OR payload #> '{data,counterAccountName}' IS NOT NULL
             OR payload #> '{data,counterAccountNumber}' IS NOT NULL
             OR payload #> '{data,virtualAccountName}' IS NOT NULL
             OR payload #> '{data,virtualAccountNumber}' IS NOT NULL
        )::bigint AS sensitive,
        COUNT(*) FILTER (WHERE received_at < ${cutoff})::bigint AS expired
      FROM payment_webhook_logs
    `
    console.info(
      `payment_webhook_preflight sensitive=${Number(preflight?.sensitive ?? 0)} expired=${Number(preflight?.expired ?? 0)}`,
    )
    if (!process.argv.includes('--apply')) {
      console.info('Dry run only. Re-run the apply command to sanitize retained rows and delete expired rows.')
      return
    }

    let deleted = 0
    let deletedBatch: number
    do {
      deletedBatch = await prisma.$executeRaw`
        DELETE FROM payment_webhook_logs
        WHERE id IN (
          SELECT id FROM payment_webhook_logs
          WHERE received_at < ${cutoff}
          ORDER BY id ASC
          LIMIT ${batchSize}
        )
      `
      deleted += deletedBatch
    } while (deletedBatch === batchSize)

    let sanitized = 0
    while (true) {
      const logs = await prisma.paymentWebhookLog.findMany({
        where: { payloadDigest: null, receivedAt: { gte: cutoff } },
        orderBy: { id: 'asc' },
        take: batchSize,
        select: { id: true, payload: true },
      })
      if (logs.length === 0) break

      await prisma.$transaction(
        logs.map((log) =>
          prisma.paymentWebhookLog.update({
            where: { id: log.id },
            data: {
              payload: sanitizePayosWebhookPayload(log.payload),
              payloadDigest: digestWebhookPayload(log.payload, envConfig.PAYMENT_WEBHOOK_LOG_HMAC_SECRET),
              digestKeyVersion: envConfig.PAYMENT_WEBHOOK_LOG_DIGEST_VERSION,
            },
          }),
        ),
      )
      sanitized += logs.length
      console.info(`payment_webhook_backfill_progress sanitized=${sanitized} deleted=${deleted}`)
    }

    const sensitive = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM payment_webhook_logs
      WHERE payload ? 'signature'
         OR payload #> '{data,accountNumber}' IS NOT NULL
         OR payload #> '{data,counterAccountName}' IS NOT NULL
         OR payload #> '{data,counterAccountNumber}' IS NOT NULL
         OR payload #> '{data,virtualAccountName}' IS NOT NULL
         OR payload #> '{data,virtualAccountNumber}' IS NOT NULL
    `
    if (Number(sensitive[0]?.count ?? 0) !== 0) {
      throw new Error('Sensitive webhook fields remain after backfill')
    }
    console.info(`payment_webhook_backfill_complete sanitized=${sanitized} deleted=${deleted}`)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Webhook log backfill failed')
  process.exitCode = 1
})
