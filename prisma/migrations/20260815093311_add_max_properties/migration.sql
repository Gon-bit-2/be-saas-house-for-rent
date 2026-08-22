/*
  Warnings:

  - You are about to drop the column `allow_ai_pricing` on the `plans` table. All the data in the column will be lost.
  - You are about to drop the column `allow_chatbot` on the `plans` table. All the data in the column will be lost.
  - You are about to drop the `ai_recommendation_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `chatbot_messages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `chatbot_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `room_price_suggestions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ai_recommendation_logs" DROP CONSTRAINT "ai_recommendation_logs_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "ai_recommendation_logs" DROP CONSTRAINT "ai_recommendation_logs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "chatbot_messages" DROP CONSTRAINT "chatbot_messages_session_id_fkey";

-- DropForeignKey
ALTER TABLE "chatbot_sessions" DROP CONSTRAINT "chatbot_sessions_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "chatbot_sessions" DROP CONSTRAINT "chatbot_sessions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "room_price_suggestions" DROP CONSTRAINT "room_price_suggestions_room_id_fkey";

-- DropForeignKey
ALTER TABLE "room_price_suggestions" DROP CONSTRAINT "room_price_suggestions_tenant_id_fkey";

-- AlterTable
ALTER TABLE "asset_categories" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "background_jobs" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "debts" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "handover_records" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable


-- AlterTable
ALTER TABLE "plans" DROP COLUMN "allow_ai_pricing",
DROP COLUMN "allow_chatbot",
ADD COLUMN     "max_properties" INTEGER NOT NULL DEFAULT 0;

-- AlterTable


-- DropTable
DROP TABLE "ai_recommendation_logs";

-- DropTable
DROP TABLE "chatbot_messages";

-- DropTable
DROP TABLE "chatbot_sessions";

-- DropTable
DROP TABLE "room_price_suggestions";

-- DropEnum
DROP TYPE "AiLogType";

-- DropEnum
DROP TYPE "ChatbotChannel";

-- DropEnum
DROP TYPE "ChatbotSenderType";

-- DropEnum
DROP TYPE "ChatbotSessionStatus";
