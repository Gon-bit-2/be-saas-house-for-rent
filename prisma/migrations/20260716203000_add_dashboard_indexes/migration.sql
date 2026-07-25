-- Composite indexes for tenant-scoped dashboard aggregate queries.
CREATE INDEX "rooms_tenant_id_status_idx" ON "rooms"("tenant_id", "status");
CREATE INDEX "contracts_tenant_id_status_idx" ON "contracts"("tenant_id", "status");
CREATE INDEX "payments_tenant_id_status_paid_at_idx" ON "payments"("tenant_id", "status", "paid_at");
