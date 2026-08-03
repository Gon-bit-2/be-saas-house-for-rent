-- CreateEnum
CREATE TYPE "SubscriptionPaymentPurpose" AS ENUM ('RENEWAL', 'PLAN_CHANGE');

-- Recreate enums so the new values can be used safely by constraints and indexes
ALTER TABLE "subscriptions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "SubscriptionStatus" RENAME TO "SubscriptionStatus_old";
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');
ALTER TABLE "subscriptions" ALTER COLUMN "status" TYPE "SubscriptionStatus" USING ("status"::text::"SubscriptionStatus");
ALTER TABLE "subscriptions" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
DROP TYPE "SubscriptionStatus_old";

ALTER TABLE "subscription_payments" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "SubscriptionPaymentStatus" RENAME TO "SubscriptionPaymentStatus_old";
CREATE TYPE "SubscriptionPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELED', 'EXPIRED');
ALTER TABLE "subscription_payments" ALTER COLUMN "status" TYPE "SubscriptionPaymentStatus" USING ("status"::text::"SubscriptionPaymentStatus");
ALTER TABLE "subscription_payments" ALTER COLUMN "status" SET DEFAULT 'PENDING';
DROP TYPE "SubscriptionPaymentStatus_old";

-- Allocate PayOS order codes from one sequence across invoice and subscription checkouts
CREATE SEQUENCE "payos_order_code_seq" AS INTEGER START WITH 1000000000 MAXVALUE 2147483647;

ALTER TABLE "payment_qr_codes" ALTER COLUMN "order_code" SET DEFAULT nextval('payos_order_code_seq'::regclass);

ALTER TABLE "subscription_payments"
ADD COLUMN "purpose" "SubscriptionPaymentPurpose" NOT NULL DEFAULT 'RENEWAL',
ADD COLUMN "provider" VARCHAR(100) NOT NULL DEFAULT 'PayOS',
ADD COLUMN "order_code" INTEGER DEFAULT nextval('payos_order_code_seq'::regclass),
ADD COLUMN "payment_link_id" VARCHAR(100),
ADD COLUMN "checkout_url" TEXT,
ADD COLUMN "qr_content" TEXT,
ADD COLUMN "provider_status" VARCHAR(50),
ADD COLUMN "expired_at" TIMESTAMPTZ,
ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "created_by_id" INTEGER,
ADD COLUMN "updated_by_id" INTEGER,
ALTER COLUMN "payment_method" SET DEFAULT 'QR';

ALTER TABLE "subscription_payments" ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "payment_webhook_logs" ADD COLUMN "subscription_payment_id" INTEGER;

ALTER TABLE "subscription_payments" DROP CONSTRAINT "subscription_payments_subscription_id_fkey";
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_id_tenant_id_key" UNIQUE ("id", "tenant_id");
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscription_id_tenant_id_fkey" FOREIGN KEY ("subscription_id", "tenant_id") REFERENCES "subscriptions"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_order_code_key" UNIQUE ("order_code");
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_payment_link_id_key" UNIQUE ("payment_link_id");
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_provider_transaction_code_key" UNIQUE ("provider", "transaction_code");
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_amount_positive_check" CHECK ("amount" > 0);
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_webhook_logs" ADD CONSTRAINT "payment_webhook_logs_subscription_payment_id_fkey" FOREIGN KEY ("subscription_payment_id") REFERENCES "subscription_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "subscriptions_tenant_id_status_idx" ON "subscriptions"("tenant_id", "status");
CREATE INDEX "subscription_payments_tenant_id_created_at_idx" ON "subscription_payments"("tenant_id", "created_at");
CREATE INDEX "subscription_payments_subscription_id_created_at_idx" ON "subscription_payments"("subscription_id", "created_at");
CREATE INDEX "subscription_payments_tenant_id_status_created_at_idx" ON "subscription_payments"("tenant_id", "status", "created_at");
CREATE INDEX "payment_webhook_logs_subscription_payment_id_idx" ON "payment_webhook_logs"("subscription_payment_id");
CREATE UNIQUE INDEX "subscriptions_one_active_per_tenant_key" ON "subscriptions"("tenant_id") WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX "subscriptions_one_pending_per_tenant_key" ON "subscriptions"("tenant_id") WHERE "status" = 'PENDING';
CREATE UNIQUE INDEX "subscription_payments_one_pending_per_tenant_key" ON "subscription_payments"("tenant_id") WHERE "status" = 'PENDING';
