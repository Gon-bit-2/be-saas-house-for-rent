-- G05 handover and termination lifecycle.
-- Abort before changing data when existing rows violate the new legal invariants.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "rental_histories" GROUP BY "contract_id" HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'G05 migration blocked: duplicate rental_histories.contract_id';
  END IF;
  IF EXISTS (SELECT 1 FROM "contract_members" GROUP BY "contract_id", "user_id" HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'G05 migration blocked: duplicate contract members';
  END IF;
  IF EXISTS (SELECT 1 FROM "handover_records" GROUP BY "contract_id", "type" HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'G05 migration blocked: duplicate handover type for contract';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "contracts"
    WHERE "status" = 'ACTIVE' AND "deleted_at" IS NULL
    GROUP BY "room_id" HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'G05 migration blocked: more than one active contract for a room';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "contract_termination_requests"
    WHERE "status" IN ('PENDING', 'APPROVED')
    GROUP BY "contract_id" HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'G05 migration blocked: more than one open termination request for a contract';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "asset_categories" ac
    WHERE NOT EXISTS (SELECT 1 FROM "room_assets" ra WHERE ra."category_id" = ac."id")
  ) THEN
    RAISE EXCEPTION 'G05 migration blocked: unreferenced asset category cannot be assigned to a tenant';
  END IF;
END $$;

ALTER TABLE "asset_categories"
  ADD COLUMN "tenant_id" INTEGER,
  ADD COLUMN "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "deleted_at" TIMESTAMPTZ;

-- Keep the original category for its first tenant and clone it for every other tenant.
DO $$
DECLARE
  category_row RECORD;
  tenant_row RECORD;
  first_tenant INTEGER;
  cloned_category_id INTEGER;
BEGIN
  FOR category_row IN SELECT "id", "name", "description", "created_by_id", "updated_by_id", "deleted_by_id" FROM "asset_categories" LOOP
    SELECT MIN("tenant_id") INTO first_tenant FROM "room_assets" WHERE "category_id" = category_row."id";
    UPDATE "asset_categories" SET "tenant_id" = first_tenant WHERE "id" = category_row."id";

    FOR tenant_row IN
      SELECT DISTINCT "tenant_id" FROM "room_assets"
      WHERE "category_id" = category_row."id" AND "tenant_id" <> first_tenant
    LOOP
      INSERT INTO "asset_categories" (
        "tenant_id", "name", "description", "created_by_id", "updated_by_id", "deleted_by_id"
      ) VALUES (
        tenant_row."tenant_id", category_row."name", category_row."description",
        category_row."created_by_id", category_row."updated_by_id", category_row."deleted_by_id"
      ) RETURNING "id" INTO cloned_category_id;

      UPDATE "room_assets"
      SET "category_id" = cloned_category_id
      WHERE "category_id" = category_row."id" AND "tenant_id" = tenant_row."tenant_id";
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE "asset_categories" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "asset_categories"
  ADD CONSTRAINT "asset_categories_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "asset_categories_tenant_id_name_key" ON "asset_categories"("tenant_id", "name");
CREATE INDEX "asset_categories_tenant_id_deleted_at_idx" ON "asset_categories"("tenant_id", "deleted_at");
CREATE INDEX "room_assets_tenant_id_room_id_deleted_at_idx" ON "room_assets"("tenant_id", "room_id", "deleted_at");
ALTER TABLE "room_assets" ADD CONSTRAINT "room_assets_quantity_check" CHECK ("quantity" > 0);

ALTER TABLE "contract_termination_requests"
  ADD COLUMN "review_note" TEXT,
  ADD COLUMN "reviewed_by_id" INTEGER,
  ADD COLUMN "reviewed_at" TIMESTAMPTZ,
  ADD COLUMN "actual_move_out_date" DATE,
  ADD COLUMN "completed_at" TIMESTAMPTZ,
  ADD COLUMN "completion_note" TEXT,
  ADD COLUMN "outstanding_debt" DECIMAL(12,2);
ALTER TABLE "contract_termination_requests"
  ADD CONSTRAINT "contract_termination_requests_reviewed_by_id_fkey"
  FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "contract_termination_requests_tenant_id_status_idx" ON "contract_termination_requests"("tenant_id", "status");
CREATE INDEX "contract_termination_requests_contract_id_status_idx" ON "contract_termination_requests"("contract_id", "status");
CREATE UNIQUE INDEX "contract_termination_requests_open_contract_key"
  ON "contract_termination_requests"("contract_id")
  WHERE "status" IN ('PENDING', 'APPROVED');

ALTER TABLE "handover_records"
  ADD COLUMN "signed_by_landlord_id" INTEGER,
  ADD COLUMN "signed_by_renter_id" INTEGER,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "content_hash" VARCHAR(64),
  ADD COLUMN "confirmed_at" TIMESTAMPTZ,
  ADD COLUMN "disputed_by_id" INTEGER,
  ADD COLUMN "dispute_reason" TEXT,
  ADD COLUMN "disputed_at" TIMESTAMPTZ,
  ADD COLUMN "resolved_by_id" INTEGER,
  ADD COLUMN "resolution_note" TEXT,
  ADD COLUMN "resolved_at" TIMESTAMPTZ,
  ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "handover_records"
SET "content_hash" = repeat(md5("id"::text || "created_at"::text), 2)
WHERE "content_hash" IS NULL;
ALTER TABLE "handover_records" ALTER COLUMN "content_hash" SET NOT NULL;
ALTER TABLE "handover_records"
  ADD CONSTRAINT "handover_records_signed_by_landlord_id_fkey" FOREIGN KEY ("signed_by_landlord_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "handover_records_signed_by_renter_id_fkey" FOREIGN KEY ("signed_by_renter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "handover_records_disputed_by_id_fkey" FOREIGN KEY ("disputed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "handover_records_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "handover_records_version_check" CHECK ("version" > 0);
CREATE UNIQUE INDEX "handover_records_contract_id_type_key" ON "handover_records"("contract_id", "type");
CREATE INDEX "handover_records_tenant_id_status_idx" ON "handover_records"("tenant_id", "status");

ALTER TABLE "handover_asset_items"
  ADD COLUMN "asset_name" VARCHAR(255),
  ADD COLUMN "category_name" VARCHAR(100),
  ADD COLUMN "expected_quantity" INTEGER,
  ADD COLUMN "actual_quantity" INTEGER;
UPDATE "handover_asset_items" item
SET
  "asset_name" = asset."name",
  "category_name" = category."name",
  "expected_quantity" = item."quantity",
  "actual_quantity" = item."quantity"
FROM "room_assets" asset
JOIN "asset_categories" category ON category."id" = asset."category_id"
WHERE asset."id" = item."room_asset_id";
ALTER TABLE "handover_asset_items"
  ALTER COLUMN "asset_name" SET NOT NULL,
  ALTER COLUMN "category_name" SET NOT NULL,
  ALTER COLUMN "expected_quantity" SET NOT NULL,
  ALTER COLUMN "actual_quantity" SET NOT NULL,
  DROP COLUMN "quantity",
  ADD CONSTRAINT "handover_asset_items_quantity_check" CHECK ("expected_quantity" > 0 AND "actual_quantity" >= 0);
CREATE UNIQUE INDEX "handover_asset_items_handover_record_id_room_asset_id_key"
  ON "handover_asset_items"("handover_record_id", "room_asset_id");

CREATE UNIQUE INDEX "rental_histories_contract_id_key" ON "rental_histories"("contract_id");
CREATE INDEX "rental_histories_tenant_id_status_idx" ON "rental_histories"("tenant_id", "status");
CREATE INDEX "rental_histories_renter_id_status_idx" ON "rental_histories"("renter_id", "status");
CREATE UNIQUE INDEX "contract_members_contract_id_user_id_key" ON "contract_members"("contract_id", "user_id");
CREATE UNIQUE INDEX "contracts_one_active_per_room_key"
  ON "contracts"("room_id") WHERE "status" = 'ACTIVE' AND "deleted_at" IS NULL;
