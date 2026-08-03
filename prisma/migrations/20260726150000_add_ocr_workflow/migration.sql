-- AlterTable
ALTER TABLE "ocr_jobs"
ADD COLUMN "image_public_id" VARCHAR(255),
ADD COLUMN "file_hash" VARCHAR(64);

-- AlterTable
ALTER TABLE "meter_readings"
ADD COLUMN "ocr_job_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "ocr_jobs_tenant_id_meter_id_file_hash_key"
ON "ocr_jobs"("tenant_id", "meter_id", "file_hash");

-- CreateIndex
CREATE INDEX "ocr_jobs_tenant_id_created_at_idx"
ON "ocr_jobs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "ocr_jobs_tenant_id_status_created_at_idx"
ON "ocr_jobs"("tenant_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "ocr_jobs_meter_id_created_at_idx"
ON "ocr_jobs"("meter_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "meter_readings_ocr_job_id_key"
ON "meter_readings"("ocr_job_id");

-- AddCheckConstraint
ALTER TABLE "ocr_jobs"
ADD CONSTRAINT "ocr_jobs_confidence_check"
CHECK ("confidence" IS NULL OR ("confidence" >= 0 AND "confidence" <= 1));

-- AddForeignKey
ALTER TABLE "meter_readings"
ADD CONSTRAINT "meter_readings_ocr_job_id_fkey"
FOREIGN KEY ("ocr_job_id") REFERENCES "ocr_jobs"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
