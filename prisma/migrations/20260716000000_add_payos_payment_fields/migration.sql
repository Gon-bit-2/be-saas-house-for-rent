-- Extend payment QR rows with PayOS payment-link mapping.
ALTER TABLE "payment_qr_codes" ALTER COLUMN "qr_content" DROP NOT NULL;
ALTER TABLE "payment_qr_codes" ADD COLUMN "order_code" INTEGER;
ALTER TABLE "payment_qr_codes" ADD COLUMN "payment_link_id" VARCHAR(100);
ALTER TABLE "payment_qr_codes" ADD COLUMN "checkout_url" TEXT;
ALTER TABLE "payment_qr_codes" ADD COLUMN "provider_status" VARCHAR(50);
ALTER TABLE "payment_qr_codes" ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "payment_qr_codes" ALTER COLUMN "updated_at" DROP DEFAULT;

-- Store renter confirmation and landlord/accountant approval metadata.
ALTER TABLE "payments" ADD COLUMN "qr_code_id" INTEGER;
ALTER TABLE "payments" ADD COLUMN "submitted_at" TIMESTAMPTZ;
ALTER TABLE "payments" ADD COLUMN "evidence_url" TEXT;
ALTER TABLE "payments" ADD COLUMN "renter_note" TEXT;
ALTER TABLE "payments" ADD COLUMN "approved_by_id" INTEGER;
ALTER TABLE "payments" ADD COLUMN "approved_at" TIMESTAMPTZ;
ALTER TABLE "payments" ADD COLUMN "rejected_by_id" INTEGER;
ALTER TABLE "payments" ADD COLUMN "rejected_at" TIMESTAMPTZ;
ALTER TABLE "payments" ADD COLUMN "landlord_note" TEXT;
ALTER TABLE "payments" ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "payments" ALTER COLUMN "updated_at" DROP DEFAULT;

-- Store normalized PayOS webhook fields alongside the raw payload.
ALTER TABLE "payment_webhook_logs" ADD COLUMN "order_code" INTEGER;
ALTER TABLE "payment_webhook_logs" ADD COLUMN "payment_link_id" VARCHAR(100);
ALTER TABLE "payment_webhook_logs" ADD COLUMN "reference" VARCHAR(100);
ALTER TABLE "payment_webhook_logs" ADD COLUMN "amount" DECIMAL(12,2);
ALTER TABLE "payment_webhook_logs" ADD COLUMN "currency" VARCHAR(10);
ALTER TABLE "payment_webhook_logs" ADD COLUMN "provider_code" VARCHAR(20);
ALTER TABLE "payment_webhook_logs" ADD COLUMN "provider_desc" TEXT;
ALTER TABLE "payment_webhook_logs" ADD COLUMN "success" BOOLEAN;
ALTER TABLE "payment_webhook_logs" ADD COLUMN "transaction_date_time" TIMESTAMPTZ;

-- Relations for QR-linked payments and manual review actors.
ALTER TABLE "payments" ADD CONSTRAINT "payments_qr_code_id_fkey" FOREIGN KEY ("qr_code_id") REFERENCES "payment_qr_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_rejected_by_id_fkey" FOREIGN KEY ("rejected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- PayOS identifiers and lookup indexes.
CREATE UNIQUE INDEX "payment_qr_codes_order_code_key" ON "payment_qr_codes"("order_code");
CREATE UNIQUE INDEX "payment_qr_codes_payment_link_id_key" ON "payment_qr_codes"("payment_link_id");
CREATE INDEX "payment_qr_codes_order_code_idx" ON "payment_qr_codes"("order_code");
CREATE INDEX "payment_qr_codes_payment_link_id_idx" ON "payment_qr_codes"("payment_link_id");

CREATE INDEX "payments_tenant_id_status_idx" ON "payments"("tenant_id", "status");
CREATE INDEX "payments_invoice_id_status_idx" ON "payments"("invoice_id", "status");
CREATE INDEX "payments_qr_code_id_idx" ON "payments"("qr_code_id");

CREATE INDEX "payment_webhook_logs_order_code_idx" ON "payment_webhook_logs"("order_code");
CREATE INDEX "payment_webhook_logs_payment_link_id_idx" ON "payment_webhook_logs"("payment_link_id");
CREATE INDEX "payment_webhook_logs_reference_idx" ON "payment_webhook_logs"("reference");
CREATE INDEX "payment_webhook_logs_provider_reference_idx" ON "payment_webhook_logs"("provider", "reference");
CREATE INDEX "payment_webhook_logs_tenant_id_status_idx" ON "payment_webhook_logs"("tenant_id", "status");