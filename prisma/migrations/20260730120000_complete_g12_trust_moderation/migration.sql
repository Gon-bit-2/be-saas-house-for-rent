-- Add notification categories used by G12.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REVIEW';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REPORT';

-- Refuse to hide invalid legacy review data behind automatic cleanup.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "reviews" r
    LEFT JOIN "contracts" c ON c."id" = r."contract_id"
    WHERE r."contract_id" IS NULL
       OR c."id" IS NULL
       OR c."tenant_id" <> r."tenant_id"
       OR c."room_id" <> r."room_id"
       OR NOT (
         c."renter_id" = r."reviewer_id"
         OR EXISTS (
           SELECT 1 FROM "contract_members" cm
           WHERE cm."contract_id" = c."id" AND cm."user_id" = r."reviewer_id"
         )
       )
       OR r."rating" NOT BETWEEN 1 AND 5
       OR r."cleanliness_score" NOT BETWEEN 1 AND 5
       OR r."location_score" NOT BETWEEN 1 AND 5
       OR r."price_score" NOT BETWEEN 1 AND 5
       OR r."service_score" NOT BETWEEN 1 AND 5
  ) THEN
    RAISE EXCEPTION 'G12 migration blocked: invalid legacy review data';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "reviews"
    GROUP BY "reviewer_id", "contract_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'G12 migration blocked: duplicate legacy reviews';
  END IF;

  IF EXISTS (SELECT 1 FROM "reports") THEN
    RAISE EXCEPTION 'G12 migration blocked: existing reports require an explicit snapshot backfill';
  END IF;
END $$;

ALTER TABLE "reviews"
  ADD COLUMN "moderated_by_id" INTEGER,
  ADD COLUMN "moderation_reason" TEXT,
  ADD COLUMN "moderated_at" TIMESTAMPTZ,
  ADD COLUMN "updated_at" TIMESTAMPTZ;

UPDATE "reviews"
SET "is_visible" = false
WHERE "status" <> 'APPROVED';

UPDATE "reviews"
SET "updated_at" = "created_at";

ALTER TABLE "reviews"
  ALTER COLUMN "contract_id" SET NOT NULL,
  ALTER COLUMN "is_visible" SET DEFAULT false,
  ALTER COLUMN "updated_at" SET NOT NULL;

ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_contract_id_fkey";
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_contract_id_fkey"
  FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_moderated_by_id_fkey"
  FOREIGN KEY ("moderated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "reviews_score_range_check"
  CHECK (
    "rating" BETWEEN 1 AND 5
    AND "cleanliness_score" BETWEEN 1 AND 5
    AND "location_score" BETWEEN 1 AND 5
    AND "price_score" BETWEEN 1 AND 5
    AND "service_score" BETWEEN 1 AND 5
  ),
  ADD CONSTRAINT "reviews_visibility_check"
  CHECK ("status" = 'APPROVED' OR "is_visible" = false);

CREATE UNIQUE INDEX "reviews_reviewer_id_contract_id_key"
  ON "reviews"("reviewer_id", "contract_id");
CREATE INDEX "reviews_reviewer_id_created_at_idx"
  ON "reviews"("reviewer_id", "created_at");
CREATE INDEX "reviews_status_created_at_idx"
  ON "reviews"("status", "created_at");
CREATE INDEX "reviews_room_id_status_is_visible_created_at_idx"
  ON "reviews"("room_id", "status", "is_visible", "created_at");

ALTER TABLE "reports"
  ADD COLUMN "target_tenant_id" INTEGER,
  ADD COLUMN "target_snapshot" JSONB NOT NULL,
  ADD COLUMN "fingerprint" VARCHAR(64) NOT NULL,
  ADD COLUMN "reviewing_at" TIMESTAMPTZ,
  ADD COLUMN "resolution_note" TEXT,
  ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL;

ALTER TABLE "reports"
  ADD CONSTRAINT "reports_state_metadata_check"
  CHECK (
    ("status" = 'PENDING' AND "handled_by" IS NULL AND "reviewing_at" IS NULL AND "resolved_at" IS NULL AND "resolution_note" IS NULL)
    OR ("status" = 'REVIEWING' AND "handled_by" IS NOT NULL AND "reviewing_at" IS NOT NULL AND "resolved_at" IS NULL AND "resolution_note" IS NULL)
    OR ("status" IN ('RESOLVED', 'REJECTED') AND "handled_by" IS NOT NULL AND "reviewing_at" IS NOT NULL AND "resolved_at" IS NOT NULL AND "resolution_note" IS NOT NULL)
  );

CREATE INDEX "reports_reporter_id_created_at_idx"
  ON "reports"("reporter_id", "created_at");
CREATE INDEX "reports_status_created_at_idx"
  ON "reports"("status", "created_at");
CREATE INDEX "reports_target_type_target_id_idx"
  ON "reports"("target_type", "target_id");
CREATE INDEX "reports_handled_by_status_idx"
  ON "reports"("handled_by", "status");
CREATE UNIQUE INDEX "reports_open_fingerprint_key"
  ON "reports"("fingerprint")
  WHERE "status" IN ('PENDING', 'REVIEWING');