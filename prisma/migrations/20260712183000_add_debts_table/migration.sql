CREATE TYPE "DebtStatus" AS ENUM ('OPEN', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELED');

CREATE TABLE "debts" (
  "id" SERIAL NOT NULL,
  "tenant_id" INTEGER NOT NULL,
  "invoice_id" INTEGER NOT NULL,
  "contract_id" INTEGER NOT NULL,
  "room_id" INTEGER NOT NULL,
  "renter_id" INTEGER NOT NULL,
  "billing_month" DATE NOT NULL,
  "original_amount" DECIMAL(12,2) NOT NULL,
  "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  "remaining_amount" DECIMAL(12,2) NOT NULL,
  "status" "DebtStatus" NOT NULL DEFAULT 'OPEN',
  "due_date" DATE NOT NULL,
  "resolved_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "debts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "debts_invoice_id_key" ON "debts"("invoice_id");
CREATE INDEX "debts_tenant_id_billing_month_idx" ON "debts"("tenant_id", "billing_month");
CREATE INDEX "debts_tenant_id_status_idx" ON "debts"("tenant_id", "status");
CREATE INDEX "debts_renter_id_status_idx" ON "debts"("renter_id", "status");

ALTER TABLE "debts" ADD CONSTRAINT "debts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "debts" ADD CONSTRAINT "debts_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "debts" ADD CONSTRAINT "debts_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "debts" ADD CONSTRAINT "debts_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "debts" ADD CONSTRAINT "debts_renter_id_fkey" FOREIGN KEY ("renter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
