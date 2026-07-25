-- Add Firebase token lifecycle fields for FCM push notifications.
ALTER TABLE "device_tokens"
  ADD COLUMN "fid" VARCHAR(255),
  ADD COLUMN "last_seen_at" TIMESTAMPTZ,
  ADD COLUMN "last_used_at" TIMESTAMPTZ,
  ADD COLUMN "failure_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "last_error" TEXT,
  ADD COLUMN "disabled_at" TIMESTAMPTZ;

-- Add BullMQ correlation metadata for background notification jobs.
ALTER TABLE "background_jobs"
  ADD COLUMN "external_job_id" VARCHAR(100),
  ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Ticket lookup indexes for landlord/staff queues and renter history.
CREATE INDEX "tickets_tenant_id_status_idx" ON "tickets"("tenant_id", "status");
CREATE INDEX "tickets_tenant_id_assigned_to_idx" ON "tickets"("tenant_id", "assigned_to");
CREATE INDEX "tickets_created_by_id_status_idx" ON "tickets"("created_by_id", "status");

-- Device token lookup indexes for active fan-out and FID/token lifecycle management.
CREATE INDEX "device_tokens_user_id_is_active_idx" ON "device_tokens"("user_id", "is_active");
CREATE INDEX "device_tokens_fid_idx" ON "device_tokens"("fid");
CREATE INDEX "device_tokens_platform_is_active_idx" ON "device_tokens"("platform", "is_active");

CREATE INDEX "background_jobs_external_job_id_idx" ON "background_jobs"("external_job_id");
