UPDATE "plans" SET "allow_ai_pricing" = false WHERE "allow_ai_pricing" IS NULL;
UPDATE "plans" SET "allow_chatbot" = false WHERE "allow_chatbot" IS NULL;

ALTER TABLE "plans" ALTER COLUMN "allow_ai_pricing" SET NOT NULL;
ALTER TABLE "plans" ALTER COLUMN "allow_chatbot" SET NOT NULL;

ALTER TABLE "chatbot_sessions" DROP CONSTRAINT IF EXISTS "chatbot_sessions_tenant_id_fkey";
ALTER TABLE "chatbot_sessions" ADD CONSTRAINT "chatbot_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
