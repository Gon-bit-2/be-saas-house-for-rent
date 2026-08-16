-- 1. Khôi phục lại các cột bị xóa
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "allow_ai_pricing" BOOLEAN DEFAULT false;
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "allow_chatbot" BOOLEAN DEFAULT false;

-- 2. Xóa các cột vừa thêm lỗi
ALTER TABLE "plans" DROP COLUMN IF EXISTS "max_properties";
ALTER TABLE "plans" DROP COLUMN IF EXISTS "max_storage_gb";

-- 3. Khôi phục các Foreign Key (Tạo tạm để Prisma không báo lỗi drift)
ALTER TABLE "ai_recommendation_logs" ADD CONSTRAINT "ai_recommendation_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_recommendation_logs" ADD CONSTRAINT "ai_recommendation_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "chatbot_messages" ADD CONSTRAINT "chatbot_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chatbot_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chatbot_sessions" ADD CONSTRAINT "chatbot_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chatbot_sessions" ADD CONSTRAINT "chatbot_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "room_price_suggestions" ADD CONSTRAINT "room_price_suggestions_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "room_price_suggestions" ADD CONSTRAINT "room_price_suggestions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Khôi phục default cho updated_at
ALTER TABLE "asset_categories" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "background_jobs" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "debts" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "handover_records" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

-- 5. Xóa lịch sử lỗi
DELETE FROM "_prisma_migrations" WHERE migration_name IN ('20260815090039_add_max_properties_plan', '20260815091500_add_max_properties');
