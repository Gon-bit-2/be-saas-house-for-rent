CREATE TABLE "service_catalog_items" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "item_type" "InvoiceItemType" NOT NULL DEFAULT 'SERVICE',
    "default_unit_price" DECIMAL(12,2) NOT NULL,
    "unit_label" VARCHAR(50) NOT NULL DEFAULT 'tháng',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "service_catalog_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "service_catalog_items_price_check" CHECK ("default_unit_price" >= 0)
);

CREATE TABLE "service_assignments" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "service_item_id" INTEGER NOT NULL,
    "room_id" INTEGER,
    "contract_id" INTEGER,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(12,2),
    "starts_at" DATE,
    "ends_at" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "service_assignments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "service_assignments_one_target_check" CHECK (("room_id" IS NOT NULL) <> ("contract_id" IS NOT NULL)),
    CONSTRAINT "service_assignments_quantity_check" CHECK ("quantity" > 0),
    CONSTRAINT "service_assignments_price_check" CHECK ("unit_price" IS NULL OR "unit_price" >= 0),
    CONSTRAINT "service_assignments_dates_check" CHECK ("ends_at" IS NULL OR "starts_at" IS NULL OR "ends_at" >= "starts_at")
);

CREATE UNIQUE INDEX "service_catalog_items_tenant_id_code_key" ON "service_catalog_items"("tenant_id", "code");
CREATE INDEX "service_catalog_items_tenant_id_is_active_idx" ON "service_catalog_items"("tenant_id", "is_active");
CREATE INDEX "service_assignments_tenant_id_is_active_idx" ON "service_assignments"("tenant_id", "is_active");
CREATE INDEX "service_assignments_service_item_id_idx" ON "service_assignments"("service_item_id");
CREATE INDEX "service_assignments_room_id_is_active_idx" ON "service_assignments"("room_id", "is_active");
CREATE INDEX "service_assignments_contract_id_is_active_idx" ON "service_assignments"("contract_id", "is_active");

ALTER TABLE "service_catalog_items" ADD CONSTRAINT "service_catalog_items_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_assignments" ADD CONSTRAINT "service_assignments_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_assignments" ADD CONSTRAINT "service_assignments_service_item_id_fkey"
    FOREIGN KEY ("service_item_id") REFERENCES "service_catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_assignments" ADD CONSTRAINT "service_assignments_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_assignments" ADD CONSTRAINT "service_assignments_contract_id_fkey"
    FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
