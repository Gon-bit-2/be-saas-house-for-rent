-- Expand first. The digest stays nullable until the resumable security backfill
-- has sanitized every retained historical row.
ALTER TABLE "payment_webhook_logs"
  ADD COLUMN "payload_digest" VARCHAR(64),
  ADD COLUMN "digest_key_version" INTEGER;

COMMENT ON COLUMN "payment_webhook_logs"."payload" IS
  'Allowlisted reconciliation fields only; raw banking account data must never be stored';
COMMENT ON COLUMN "payment_webhook_logs"."payload_digest" IS
  'HMAC-SHA256 of the canonical original payload before redaction';

CREATE INDEX "payment_webhook_logs_received_at_id_idx"
  ON "payment_webhook_logs"("received_at", "id");
