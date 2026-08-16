ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "cover_image_url" TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "cover_image_public_id" VARCHAR(100);
