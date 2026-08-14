ALTER TABLE "properties"
  ADD COLUMN "province_code" VARCHAR(2),
  ADD COLUMN "ward_code" VARCHAR(5),
  ALTER COLUMN "district" DROP NOT NULL;

CREATE INDEX "properties_province_code_ward_code_idx"
  ON "properties"("province_code", "ward_code");
