/*
  Warnings:

  - The primary key for the `ai_recommendation_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `ai_recommendation_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `user_id` column on the `ai_recommendation_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `tenant_id` column on the `ai_recommendation_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `amenities` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `amenities` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `created_by_id` column on the `amenities` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deleted_by_id` column on the `amenities` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updated_by_id` column on the `amenities` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `asset_categories` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `asset_categories` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `created_by_id` column on the `asset_categories` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deleted_by_id` column on the `asset_categories` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updated_by_id` column on the `asset_categories` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `audit_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `audit_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `tenant_id` column on the `audit_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `actor_id` column on the `audit_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `background_jobs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `background_jobs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `tenant_id` column on the `background_jobs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `chatbot_messages` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `chatbot_messages` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `chatbot_sessions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `chatbot_sessions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `user_id` column on the `chatbot_sessions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `tenant_id` column on the `chatbot_sessions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `contract_files` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `contract_files` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `contract_members` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `contract_members` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `contract_templates` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `contract_templates` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `created_by_id` column on the `contract_templates` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deleted_by_id` column on the `contract_templates` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updated_by_id` column on the `contract_templates` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `contract_termination_requests` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `contract_termination_requests` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `created_by_id` column on the `contract_termination_requests` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deleted_by_id` column on the `contract_termination_requests` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updated_by_id` column on the `contract_termination_requests` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `contracts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `contracts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `rental_request_id` column on the `contracts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `template_id` column on the `contracts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `created_by_id` column on the `contracts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deleted_by_id` column on the `contracts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updated_by_id` column on the `contracts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `conversation_members` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `conversations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `conversations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `room_id` column on the `conversations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `contract_id` column on the `conversations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `ticket_id` column on the `conversations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `device_tokens` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `device_tokens` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `favorite_rooms` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `floors` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `floors` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `handover_asset_items` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `handover_asset_items` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `handover_records` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `handover_records` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `created_by_id` column on the `handover_records` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deleted_by_id` column on the `handover_records` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updated_by_id` column on the `handover_records` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `invoice_batches` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `invoice_batches` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `created_by_id` column on the `invoice_batches` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deleted_by_id` column on the `invoice_batches` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updated_by_id` column on the `invoice_batches` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `invoice_items` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `invoice_items` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `meter_reading_id` column on the `invoice_items` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `invoices` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `invoices` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `batch_id` column on the `invoices` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `created_by_id` column on the `invoices` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deleted_by_id` column on the `invoices` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updated_by_id` column on the `invoices` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `messages` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `messages` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `meter_readings` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `meter_readings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `contract_id` column on the `meter_readings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `created_by_id` column on the `meter_readings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deleted_by_id` column on the `meter_readings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updated_by_id` column on the `meter_readings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `notifications` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `notifications` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `tenant_id` column on the `notifications` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `ocr_jobs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `ocr_jobs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `payment_qr_codes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `payment_qr_codes` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `payment_webhook_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `payment_webhook_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `tenant_id` column on the `payment_webhook_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `invoice_id` column on the `payment_webhook_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `payments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `payments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `created_by_id` column on the `payments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deleted_by_id` column on the `payments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updated_by_id` column on the `payments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `permissions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `permissions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `created_by_id` column on the `permissions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deleted_by_id` column on the `permissions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updated_by_id` column on the `permissions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `plans` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `plans` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `created_by_id` column on the `plans` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deleted_by_id` column on the `plans` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updated_by_id` column on the `plans` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `properties` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `properties` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `created_by_id` column on the `properties` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deleted_by_id` column on the `properties` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updated_by_id` column on the `properties` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `refresh_tokens` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `refresh_tokens` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `rental_histories` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `rental_histories` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `rental_requests` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `rental_requests` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `appointment_id` column on the `rental_requests` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `created_by_id` column on the `rental_requests` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deleted_by_id` column on the `rental_requests` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updated_by_id` column on the `rental_requests` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `renter_profiles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `renter_profiles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `reports` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `reports` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `handled_by` column on the `reports` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `reputation_scores` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `reputation_scores` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `room_id` column on the `reputation_scores` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `reviews` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `reviews` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `contract_id` column on the `reviews` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `role_permissions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `created_by_id` column on the `roles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deleted_by_id` column on the `roles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updated_by_id` column on the `roles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `room_amenities` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `room_assets` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `room_assets` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `created_by_id` column on the `room_assets` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deleted_by_id` column on the `room_assets` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updated_by_id` column on the `room_assets` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `room_images` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `room_images` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `room_price_suggestions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `room_price_suggestions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `room_view_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `room_view_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `user_id` column on the `room_view_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `room_viewing_appointments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `room_viewing_appointments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `assigned_staff_id` column on the `room_viewing_appointments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `created_by_id` column on the `room_viewing_appointments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deleted_by_id` column on the `room_viewing_appointments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updated_by_id` column on the `room_viewing_appointments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `rooms` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `rooms` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `floor_id` column on the `rooms` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `created_by_id` column on the `rooms` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deleted_by_id` column on the `rooms` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updated_by_id` column on the `rooms` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `subscription_payments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `subscription_payments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `subscriptions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `subscriptions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `system_settings` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `system_settings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `tenant_members` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `tenant_members` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `tenants` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `tenants` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `created_by_id` column on the `tenants` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deleted_by_id` column on the `tenants` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updated_by_id` column on the `tenants` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `ticket_attachments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `ticket_attachments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `ticket_comments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `ticket_comments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `tickets` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `tickets` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `contract_id` column on the `tickets` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `assigned_to` column on the `tickets` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `created_by_id` column on the `tickets` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deleted_by_id` column on the `tickets` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updated_by_id` column on the `tickets` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `utility_meters` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `utility_meters` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `verification_codes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `verification_codes` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `session_id` on the `chatbot_messages` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `contract_id` on the `contract_files` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `contract_id` on the `contract_members` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `contract_members` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `contract_templates` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `contract_termination_requests` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `contract_id` on the `contract_termination_requests` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `contracts` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `room_id` on the `contracts` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `renter_id` on the `contracts` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `conversation_id` on the `conversation_members` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `conversation_members` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `conversations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `device_tokens` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `favorite_rooms` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `room_id` on the `favorite_rooms` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `floors` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `property_id` on the `floors` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `handover_record_id` on the `handover_asset_items` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `room_asset_id` on the `handover_asset_items` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `handover_records` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `contract_id` on the `handover_records` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `room_id` on the `handover_records` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `invoice_batches` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `invoice_id` on the `invoice_items` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `invoices` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `contract_id` on the `invoices` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `room_id` on the `invoices` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `renter_id` on the `invoices` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `conversation_id` on the `messages` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `sender_id` on the `messages` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `meter_readings` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `room_id` on the `meter_readings` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `meter_id` on the `meter_readings` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `notifications` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `ocr_jobs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `room_id` on the `ocr_jobs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `meter_id` on the `ocr_jobs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `uploaded_by` on the `ocr_jobs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `payment_qr_codes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `invoice_id` on the `payment_qr_codes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `payments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `invoice_id` on the `payments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `payer_id` on the `payments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `properties` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `refresh_tokens` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `renter_id` on the `rental_histories` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `rental_histories` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `room_id` on the `rental_histories` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `contract_id` on the `rental_histories` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `rental_requests` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `room_id` on the `rental_requests` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `renter_id` on the `rental_requests` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `renter_profiles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `reporter_id` on the `reports` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `reputation_scores` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `reviews` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `room_id` on the `reviews` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `reviewer_id` on the `reviews` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `permission_id` on the `role_permissions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `room_id` on the `room_amenities` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `amenity_id` on the `room_amenities` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `room_assets` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `room_id` on the `room_assets` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `category_id` on the `room_assets` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `room_id` on the `room_images` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `room_price_suggestions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `room_id` on the `room_price_suggestions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `room_id` on the `room_view_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `room_viewing_appointments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `room_id` on the `room_viewing_appointments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `renter_id` on the `room_viewing_appointments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `rooms` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `property_id` on the `rooms` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `subscription_id` on the `subscription_payments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `subscription_payments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `subscriptions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `plan_id` on the `subscriptions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `tenant_members` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `tenant_members` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `owner_user_id` on the `tenants` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `ticket_id` on the `ticket_attachments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `uploaded_by` on the `ticket_attachments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `ticket_id` on the `ticket_comments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `ticket_comments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `tickets` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `room_id` on the `tickets` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenant_id` on the `utility_meters` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `room_id` on the `utility_meters` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "ai_recommendation_logs" DROP CONSTRAINT "ai_recommendation_logs_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "ai_recommendation_logs" DROP CONSTRAINT "ai_recommendation_logs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "amenities" DROP CONSTRAINT "amenities_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "amenities" DROP CONSTRAINT "amenities_deleted_by_id_fkey";

-- DropForeignKey
ALTER TABLE "amenities" DROP CONSTRAINT "amenities_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "asset_categories" DROP CONSTRAINT "asset_categories_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "asset_categories" DROP CONSTRAINT "asset_categories_deleted_by_id_fkey";

-- DropForeignKey
ALTER TABLE "asset_categories" DROP CONSTRAINT "asset_categories_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actor_id_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "background_jobs" DROP CONSTRAINT "background_jobs_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "chatbot_messages" DROP CONSTRAINT "chatbot_messages_session_id_fkey";

-- DropForeignKey
ALTER TABLE "chatbot_sessions" DROP CONSTRAINT "chatbot_sessions_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "chatbot_sessions" DROP CONSTRAINT "chatbot_sessions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "contract_files" DROP CONSTRAINT "contract_files_contract_id_fkey";

-- DropForeignKey
ALTER TABLE "contract_members" DROP CONSTRAINT "contract_members_contract_id_fkey";

-- DropForeignKey
ALTER TABLE "contract_members" DROP CONSTRAINT "contract_members_user_id_fkey";

-- DropForeignKey
ALTER TABLE "contract_templates" DROP CONSTRAINT "contract_templates_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "contract_templates" DROP CONSTRAINT "contract_templates_deleted_by_id_fkey";

-- DropForeignKey
ALTER TABLE "contract_templates" DROP CONSTRAINT "contract_templates_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "contract_templates" DROP CONSTRAINT "contract_templates_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "contract_termination_requests" DROP CONSTRAINT "contract_termination_requests_contract_id_fkey";

-- DropForeignKey
ALTER TABLE "contract_termination_requests" DROP CONSTRAINT "contract_termination_requests_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "contract_termination_requests" DROP CONSTRAINT "contract_termination_requests_deleted_by_id_fkey";

-- DropForeignKey
ALTER TABLE "contract_termination_requests" DROP CONSTRAINT "contract_termination_requests_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "contract_termination_requests" DROP CONSTRAINT "contract_termination_requests_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_deleted_by_id_fkey";

-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_rental_request_id_fkey";

-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_renter_id_fkey";

-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_room_id_fkey";

-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_template_id_fkey";

-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "conversation_members" DROP CONSTRAINT "conversation_members_conversation_id_fkey";

-- DropForeignKey
ALTER TABLE "conversation_members" DROP CONSTRAINT "conversation_members_user_id_fkey";

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_contract_id_fkey";

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_room_id_fkey";

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_ticket_id_fkey";

-- DropForeignKey
ALTER TABLE "device_tokens" DROP CONSTRAINT "device_tokens_user_id_fkey";

-- DropForeignKey
ALTER TABLE "favorite_rooms" DROP CONSTRAINT "favorite_rooms_room_id_fkey";

-- DropForeignKey
ALTER TABLE "favorite_rooms" DROP CONSTRAINT "favorite_rooms_user_id_fkey";

-- DropForeignKey
ALTER TABLE "floors" DROP CONSTRAINT "floors_property_id_fkey";

-- DropForeignKey
ALTER TABLE "floors" DROP CONSTRAINT "floors_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "handover_asset_items" DROP CONSTRAINT "handover_asset_items_handover_record_id_fkey";

-- DropForeignKey
ALTER TABLE "handover_asset_items" DROP CONSTRAINT "handover_asset_items_room_asset_id_fkey";

-- DropForeignKey
ALTER TABLE "handover_records" DROP CONSTRAINT "handover_records_contract_id_fkey";

-- DropForeignKey
ALTER TABLE "handover_records" DROP CONSTRAINT "handover_records_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "handover_records" DROP CONSTRAINT "handover_records_deleted_by_id_fkey";

-- DropForeignKey
ALTER TABLE "handover_records" DROP CONSTRAINT "handover_records_room_id_fkey";

-- DropForeignKey
ALTER TABLE "handover_records" DROP CONSTRAINT "handover_records_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "handover_records" DROP CONSTRAINT "handover_records_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "invoice_batches" DROP CONSTRAINT "invoice_batches_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "invoice_batches" DROP CONSTRAINT "invoice_batches_deleted_by_id_fkey";

-- DropForeignKey
ALTER TABLE "invoice_batches" DROP CONSTRAINT "invoice_batches_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "invoice_batches" DROP CONSTRAINT "invoice_batches_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "invoice_items" DROP CONSTRAINT "invoice_items_invoice_id_fkey";

-- DropForeignKey
ALTER TABLE "invoice_items" DROP CONSTRAINT "invoice_items_meter_reading_id_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_batch_id_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_contract_id_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_deleted_by_id_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_renter_id_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_room_id_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_conversation_id_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_sender_id_fkey";

-- DropForeignKey
ALTER TABLE "meter_readings" DROP CONSTRAINT "meter_readings_contract_id_fkey";

-- DropForeignKey
ALTER TABLE "meter_readings" DROP CONSTRAINT "meter_readings_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "meter_readings" DROP CONSTRAINT "meter_readings_deleted_by_id_fkey";

-- DropForeignKey
ALTER TABLE "meter_readings" DROP CONSTRAINT "meter_readings_meter_id_fkey";

-- DropForeignKey
ALTER TABLE "meter_readings" DROP CONSTRAINT "meter_readings_room_id_fkey";

-- DropForeignKey
ALTER TABLE "meter_readings" DROP CONSTRAINT "meter_readings_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "meter_readings" DROP CONSTRAINT "meter_readings_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_fkey";

-- DropForeignKey
ALTER TABLE "ocr_jobs" DROP CONSTRAINT "ocr_jobs_meter_id_fkey";

-- DropForeignKey
ALTER TABLE "ocr_jobs" DROP CONSTRAINT "ocr_jobs_room_id_fkey";

-- DropForeignKey
ALTER TABLE "ocr_jobs" DROP CONSTRAINT "ocr_jobs_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "ocr_jobs" DROP CONSTRAINT "ocr_jobs_uploaded_by_fkey";

-- DropForeignKey
ALTER TABLE "payment_qr_codes" DROP CONSTRAINT "payment_qr_codes_invoice_id_fkey";

-- DropForeignKey
ALTER TABLE "payment_qr_codes" DROP CONSTRAINT "payment_qr_codes_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "payment_webhook_logs" DROP CONSTRAINT "payment_webhook_logs_invoice_id_fkey";

-- DropForeignKey
ALTER TABLE "payment_webhook_logs" DROP CONSTRAINT "payment_webhook_logs_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_deleted_by_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_invoice_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_payer_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "permissions" DROP CONSTRAINT "permissions_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "permissions" DROP CONSTRAINT "permissions_deleted_by_id_fkey";

-- DropForeignKey
ALTER TABLE "permissions" DROP CONSTRAINT "permissions_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "plans" DROP CONSTRAINT "plans_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "plans" DROP CONSTRAINT "plans_deleted_by_id_fkey";

-- DropForeignKey
ALTER TABLE "plans" DROP CONSTRAINT "plans_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "properties" DROP CONSTRAINT "properties_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "properties" DROP CONSTRAINT "properties_deleted_by_id_fkey";

-- DropForeignKey
ALTER TABLE "properties" DROP CONSTRAINT "properties_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "properties" DROP CONSTRAINT "properties_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_user_id_fkey";

-- DropForeignKey
ALTER TABLE "rental_histories" DROP CONSTRAINT "rental_histories_contract_id_fkey";

-- DropForeignKey
ALTER TABLE "rental_histories" DROP CONSTRAINT "rental_histories_renter_id_fkey";

-- DropForeignKey
ALTER TABLE "rental_histories" DROP CONSTRAINT "rental_histories_room_id_fkey";

-- DropForeignKey
ALTER TABLE "rental_histories" DROP CONSTRAINT "rental_histories_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "rental_requests" DROP CONSTRAINT "rental_requests_appointment_id_fkey";

-- DropForeignKey
ALTER TABLE "rental_requests" DROP CONSTRAINT "rental_requests_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "rental_requests" DROP CONSTRAINT "rental_requests_deleted_by_id_fkey";

-- DropForeignKey
ALTER TABLE "rental_requests" DROP CONSTRAINT "rental_requests_renter_id_fkey";

-- DropForeignKey
ALTER TABLE "rental_requests" DROP CONSTRAINT "rental_requests_room_id_fkey";

-- DropForeignKey
ALTER TABLE "rental_requests" DROP CONSTRAINT "rental_requests_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "rental_requests" DROP CONSTRAINT "rental_requests_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "renter_profiles" DROP CONSTRAINT "renter_profiles_user_id_fkey";

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_handled_by_fkey";

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_reporter_id_fkey";

-- DropForeignKey
ALTER TABLE "reputation_scores" DROP CONSTRAINT "reputation_scores_room_id_fkey";

-- DropForeignKey
ALTER TABLE "reputation_scores" DROP CONSTRAINT "reputation_scores_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_contract_id_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_reviewer_id_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_room_id_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_permission_id_fkey";

-- DropForeignKey
ALTER TABLE "roles" DROP CONSTRAINT "roles_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "roles" DROP CONSTRAINT "roles_deleted_by_id_fkey";

-- DropForeignKey
ALTER TABLE "roles" DROP CONSTRAINT "roles_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "room_amenities" DROP CONSTRAINT "room_amenities_amenity_id_fkey";

-- DropForeignKey
ALTER TABLE "room_amenities" DROP CONSTRAINT "room_amenities_room_id_fkey";

-- DropForeignKey
ALTER TABLE "room_assets" DROP CONSTRAINT "room_assets_category_id_fkey";

-- DropForeignKey
ALTER TABLE "room_assets" DROP CONSTRAINT "room_assets_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "room_assets" DROP CONSTRAINT "room_assets_deleted_by_id_fkey";

-- DropForeignKey
ALTER TABLE "room_assets" DROP CONSTRAINT "room_assets_room_id_fkey";

-- DropForeignKey
ALTER TABLE "room_assets" DROP CONSTRAINT "room_assets_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "room_assets" DROP CONSTRAINT "room_assets_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "room_images" DROP CONSTRAINT "room_images_room_id_fkey";

-- DropForeignKey
ALTER TABLE "room_price_suggestions" DROP CONSTRAINT "room_price_suggestions_room_id_fkey";

-- DropForeignKey
ALTER TABLE "room_price_suggestions" DROP CONSTRAINT "room_price_suggestions_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "room_view_logs" DROP CONSTRAINT "room_view_logs_room_id_fkey";

-- DropForeignKey
ALTER TABLE "room_view_logs" DROP CONSTRAINT "room_view_logs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "room_viewing_appointments" DROP CONSTRAINT "room_viewing_appointments_assigned_staff_id_fkey";

-- DropForeignKey
ALTER TABLE "room_viewing_appointments" DROP CONSTRAINT "room_viewing_appointments_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "room_viewing_appointments" DROP CONSTRAINT "room_viewing_appointments_deleted_by_id_fkey";

-- DropForeignKey
ALTER TABLE "room_viewing_appointments" DROP CONSTRAINT "room_viewing_appointments_renter_id_fkey";

-- DropForeignKey
ALTER TABLE "room_viewing_appointments" DROP CONSTRAINT "room_viewing_appointments_room_id_fkey";

-- DropForeignKey
ALTER TABLE "room_viewing_appointments" DROP CONSTRAINT "room_viewing_appointments_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "room_viewing_appointments" DROP CONSTRAINT "room_viewing_appointments_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_deleted_by_id_fkey";

-- DropForeignKey
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_floor_id_fkey";

-- DropForeignKey
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_property_id_fkey";

-- DropForeignKey
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "subscription_payments" DROP CONSTRAINT "subscription_payments_subscription_id_fkey";

-- DropForeignKey
ALTER TABLE "subscription_payments" DROP CONSTRAINT "subscription_payments_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_plan_id_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_members" DROP CONSTRAINT "tenant_members_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_members" DROP CONSTRAINT "tenant_members_user_id_fkey";

-- DropForeignKey
ALTER TABLE "tenants" DROP CONSTRAINT "tenants_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "tenants" DROP CONSTRAINT "tenants_deleted_by_id_fkey";

-- DropForeignKey
ALTER TABLE "tenants" DROP CONSTRAINT "tenants_owner_user_id_fkey";

-- DropForeignKey
ALTER TABLE "tenants" DROP CONSTRAINT "tenants_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "ticket_attachments" DROP CONSTRAINT "ticket_attachments_ticket_id_fkey";

-- DropForeignKey
ALTER TABLE "ticket_attachments" DROP CONSTRAINT "ticket_attachments_uploaded_by_fkey";

-- DropForeignKey
ALTER TABLE "ticket_comments" DROP CONSTRAINT "ticket_comments_ticket_id_fkey";

-- DropForeignKey
ALTER TABLE "ticket_comments" DROP CONSTRAINT "ticket_comments_user_id_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_assigned_to_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_contract_id_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_deleted_by_id_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_room_id_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "utility_meters" DROP CONSTRAINT "utility_meters_room_id_fkey";

-- DropForeignKey
ALTER TABLE "utility_meters" DROP CONSTRAINT "utility_meters_tenant_id_fkey";

-- AlterTable
ALTER TABLE "ai_recommendation_logs" DROP CONSTRAINT "ai_recommendation_logs_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" INTEGER,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER,
ADD CONSTRAINT "ai_recommendation_logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "amenities" DROP CONSTRAINT "amenities_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "created_by_id",
ADD COLUMN     "created_by_id" INTEGER,
DROP COLUMN "deleted_by_id",
ADD COLUMN     "deleted_by_id" INTEGER,
DROP COLUMN "updated_by_id",
ADD COLUMN     "updated_by_id" INTEGER,
ADD CONSTRAINT "amenities_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "asset_categories" DROP CONSTRAINT "asset_categories_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "created_by_id",
ADD COLUMN     "created_by_id" INTEGER,
DROP COLUMN "deleted_by_id",
ADD COLUMN     "deleted_by_id" INTEGER,
DROP COLUMN "updated_by_id",
ADD COLUMN     "updated_by_id" INTEGER,
ADD CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER,
DROP COLUMN "actor_id",
ADD COLUMN     "actor_id" INTEGER,
ALTER COLUMN "entity_id" SET DATA TYPE VARCHAR(50),
ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "background_jobs" DROP CONSTRAINT "background_jobs_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER,
ADD CONSTRAINT "background_jobs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "chatbot_messages" DROP CONSTRAINT "chatbot_messages_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "session_id",
ADD COLUMN     "session_id" INTEGER NOT NULL,
ADD CONSTRAINT "chatbot_messages_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "chatbot_sessions" DROP CONSTRAINT "chatbot_sessions_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" INTEGER,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER,
ADD CONSTRAINT "chatbot_sessions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "contract_files" DROP CONSTRAINT "contract_files_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "contract_id",
ADD COLUMN     "contract_id" INTEGER NOT NULL,
ADD CONSTRAINT "contract_files_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "contract_members" DROP CONSTRAINT "contract_members_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "contract_id",
ADD COLUMN     "contract_id" INTEGER NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" INTEGER NOT NULL,
ADD CONSTRAINT "contract_members_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "contract_templates" DROP CONSTRAINT "contract_templates_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER NOT NULL,
DROP COLUMN "created_by_id",
ADD COLUMN     "created_by_id" INTEGER,
DROP COLUMN "deleted_by_id",
ADD COLUMN     "deleted_by_id" INTEGER,
DROP COLUMN "updated_by_id",
ADD COLUMN     "updated_by_id" INTEGER,
ADD CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "contract_termination_requests" DROP CONSTRAINT "contract_termination_requests_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER NOT NULL,
DROP COLUMN "contract_id",
ADD COLUMN     "contract_id" INTEGER NOT NULL,
DROP COLUMN "created_by_id",
ADD COLUMN     "created_by_id" INTEGER,
DROP COLUMN "deleted_by_id",
ADD COLUMN     "deleted_by_id" INTEGER,
DROP COLUMN "updated_by_id",
ADD COLUMN     "updated_by_id" INTEGER,
ADD CONSTRAINT "contract_termination_requests_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER NOT NULL,
DROP COLUMN "room_id",
ADD COLUMN     "room_id" INTEGER NOT NULL,
DROP COLUMN "renter_id",
ADD COLUMN     "renter_id" INTEGER NOT NULL,
DROP COLUMN "rental_request_id",
ADD COLUMN     "rental_request_id" INTEGER,
DROP COLUMN "template_id",
ADD COLUMN     "template_id" INTEGER,
DROP COLUMN "created_by_id",
ADD COLUMN     "created_by_id" INTEGER,
DROP COLUMN "deleted_by_id",
ADD COLUMN     "deleted_by_id" INTEGER,
DROP COLUMN "updated_by_id",
ADD COLUMN     "updated_by_id" INTEGER,
ADD CONSTRAINT "contracts_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "conversation_members" DROP CONSTRAINT "conversation_members_pkey",
DROP COLUMN "conversation_id",
ADD COLUMN     "conversation_id" INTEGER NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" INTEGER NOT NULL,
ADD CONSTRAINT "conversation_members_pkey" PRIMARY KEY ("conversation_id", "user_id");

-- AlterTable
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER NOT NULL,
DROP COLUMN "room_id",
ADD COLUMN     "room_id" INTEGER,
DROP COLUMN "contract_id",
ADD COLUMN     "contract_id" INTEGER,
DROP COLUMN "ticket_id",
ADD COLUMN     "ticket_id" INTEGER,
ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "device_tokens" DROP CONSTRAINT "device_tokens_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" INTEGER NOT NULL,
ADD CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "favorite_rooms" DROP CONSTRAINT "favorite_rooms_pkey",
DROP COLUMN "user_id",
ADD COLUMN     "user_id" INTEGER NOT NULL,
DROP COLUMN "room_id",
ADD COLUMN     "room_id" INTEGER NOT NULL,
ADD CONSTRAINT "favorite_rooms_pkey" PRIMARY KEY ("user_id", "room_id");

-- AlterTable
ALTER TABLE "floors" DROP CONSTRAINT "floors_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER NOT NULL,
DROP COLUMN "property_id",
ADD COLUMN     "property_id" INTEGER NOT NULL,
ADD CONSTRAINT "floors_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "handover_asset_items" DROP CONSTRAINT "handover_asset_items_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "handover_record_id",
ADD COLUMN     "handover_record_id" INTEGER NOT NULL,
DROP COLUMN "room_asset_id",
ADD COLUMN     "room_asset_id" INTEGER NOT NULL,
ADD CONSTRAINT "handover_asset_items_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "handover_records" DROP CONSTRAINT "handover_records_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER NOT NULL,
DROP COLUMN "contract_id",
ADD COLUMN     "contract_id" INTEGER NOT NULL,
DROP COLUMN "room_id",
ADD COLUMN     "room_id" INTEGER NOT NULL,
DROP COLUMN "created_by_id",
ADD COLUMN     "created_by_id" INTEGER,
DROP COLUMN "deleted_by_id",
ADD COLUMN     "deleted_by_id" INTEGER,
DROP COLUMN "updated_by_id",
ADD COLUMN     "updated_by_id" INTEGER,
ADD CONSTRAINT "handover_records_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "invoice_batches" DROP CONSTRAINT "invoice_batches_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER NOT NULL,
DROP COLUMN "created_by_id",
ADD COLUMN     "created_by_id" INTEGER,
DROP COLUMN "deleted_by_id",
ADD COLUMN     "deleted_by_id" INTEGER,
DROP COLUMN "updated_by_id",
ADD COLUMN     "updated_by_id" INTEGER,
ADD CONSTRAINT "invoice_batches_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "invoice_items" DROP CONSTRAINT "invoice_items_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "invoice_id",
ADD COLUMN     "invoice_id" INTEGER NOT NULL,
DROP COLUMN "meter_reading_id",
ADD COLUMN     "meter_reading_id" INTEGER,
ADD CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER NOT NULL,
DROP COLUMN "batch_id",
ADD COLUMN     "batch_id" INTEGER,
DROP COLUMN "contract_id",
ADD COLUMN     "contract_id" INTEGER NOT NULL,
DROP COLUMN "room_id",
ADD COLUMN     "room_id" INTEGER NOT NULL,
DROP COLUMN "renter_id",
ADD COLUMN     "renter_id" INTEGER NOT NULL,
DROP COLUMN "created_by_id",
ADD COLUMN     "created_by_id" INTEGER,
DROP COLUMN "deleted_by_id",
ADD COLUMN     "deleted_by_id" INTEGER,
DROP COLUMN "updated_by_id",
ADD COLUMN     "updated_by_id" INTEGER,
ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "messages" DROP CONSTRAINT "messages_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "conversation_id",
ADD COLUMN     "conversation_id" INTEGER NOT NULL,
DROP COLUMN "sender_id",
ADD COLUMN     "sender_id" INTEGER NOT NULL,
ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "meter_readings" DROP CONSTRAINT "meter_readings_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER NOT NULL,
DROP COLUMN "room_id",
ADD COLUMN     "room_id" INTEGER NOT NULL,
DROP COLUMN "meter_id",
ADD COLUMN     "meter_id" INTEGER NOT NULL,
DROP COLUMN "contract_id",
ADD COLUMN     "contract_id" INTEGER,
DROP COLUMN "created_by_id",
ADD COLUMN     "created_by_id" INTEGER,
DROP COLUMN "deleted_by_id",
ADD COLUMN     "deleted_by_id" INTEGER,
DROP COLUMN "updated_by_id",
ADD COLUMN     "updated_by_id" INTEGER,
ADD CONSTRAINT "meter_readings_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" INTEGER NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER,
ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "ocr_jobs" DROP CONSTRAINT "ocr_jobs_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER NOT NULL,
DROP COLUMN "room_id",
ADD COLUMN     "room_id" INTEGER NOT NULL,
DROP COLUMN "meter_id",
ADD COLUMN     "meter_id" INTEGER NOT NULL,
DROP COLUMN "uploaded_by",
ADD COLUMN     "uploaded_by" INTEGER NOT NULL,
ADD CONSTRAINT "ocr_jobs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "payment_qr_codes" DROP CONSTRAINT "payment_qr_codes_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER NOT NULL,
DROP COLUMN "invoice_id",
ADD COLUMN     "invoice_id" INTEGER NOT NULL,
ADD CONSTRAINT "payment_qr_codes_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "payment_webhook_logs" DROP CONSTRAINT "payment_webhook_logs_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER,
DROP COLUMN "invoice_id",
ADD COLUMN     "invoice_id" INTEGER,
ADD CONSTRAINT "payment_webhook_logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "payments" DROP CONSTRAINT "payments_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER NOT NULL,
DROP COLUMN "invoice_id",
ADD COLUMN     "invoice_id" INTEGER NOT NULL,
DROP COLUMN "payer_id",
ADD COLUMN     "payer_id" INTEGER NOT NULL,
DROP COLUMN "created_by_id",
ADD COLUMN     "created_by_id" INTEGER,
DROP COLUMN "deleted_by_id",
ADD COLUMN     "deleted_by_id" INTEGER,
DROP COLUMN "updated_by_id",
ADD COLUMN     "updated_by_id" INTEGER,
ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "permissions" DROP CONSTRAINT "permissions_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "created_by_id",
ADD COLUMN     "created_by_id" INTEGER,
DROP COLUMN "deleted_by_id",
ADD COLUMN     "deleted_by_id" INTEGER,
DROP COLUMN "updated_by_id",
ADD COLUMN     "updated_by_id" INTEGER,
ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "plans" DROP CONSTRAINT "plans_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "created_by_id",
ADD COLUMN     "created_by_id" INTEGER,
DROP COLUMN "deleted_by_id",
ADD COLUMN     "deleted_by_id" INTEGER,
DROP COLUMN "updated_by_id",
ADD COLUMN     "updated_by_id" INTEGER,
ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "properties" DROP CONSTRAINT "properties_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER NOT NULL,
DROP COLUMN "created_by_id",
ADD COLUMN     "created_by_id" INTEGER,
DROP COLUMN "deleted_by_id",
ADD COLUMN     "deleted_by_id" INTEGER,
DROP COLUMN "updated_by_id",
ADD COLUMN     "updated_by_id" INTEGER,
ADD CONSTRAINT "properties_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_pkey",
ADD COLUMN     "device_id" INTEGER,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" INTEGER NOT NULL,
ADD CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "rental_histories" DROP CONSTRAINT "rental_histories_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "renter_id",
ADD COLUMN     "renter_id" INTEGER NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER NOT NULL,
DROP COLUMN "room_id",
ADD COLUMN     "room_id" INTEGER NOT NULL,
DROP COLUMN "contract_id",
ADD COLUMN     "contract_id" INTEGER NOT NULL,
ADD CONSTRAINT "rental_histories_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "rental_requests" DROP CONSTRAINT "rental_requests_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER NOT NULL,
DROP COLUMN "room_id",
ADD COLUMN     "room_id" INTEGER NOT NULL,
DROP COLUMN "renter_id",
ADD COLUMN     "renter_id" INTEGER NOT NULL,
DROP COLUMN "appointment_id",
ADD COLUMN     "appointment_id" INTEGER,
DROP COLUMN "created_by_id",
ADD COLUMN     "created_by_id" INTEGER,
DROP COLUMN "deleted_by_id",
ADD COLUMN     "deleted_by_id" INTEGER,
DROP COLUMN "updated_by_id",
ADD COLUMN     "updated_by_id" INTEGER,
ADD CONSTRAINT "rental_requests_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "renter_profiles" DROP CONSTRAINT "renter_profiles_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" INTEGER NOT NULL,
ADD CONSTRAINT "renter_profiles_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "reports" DROP CONSTRAINT "reports_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "reporter_id",
ADD COLUMN     "reporter_id" INTEGER NOT NULL,
ALTER COLUMN "target_id" SET DATA TYPE VARCHAR(50),
DROP COLUMN "handled_by",
ADD COLUMN     "handled_by" INTEGER,
ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "reputation_scores" DROP CONSTRAINT "reputation_scores_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER NOT NULL,
DROP COLUMN "room_id",
ADD COLUMN     "room_id" INTEGER,
ADD CONSTRAINT "reputation_scores_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER NOT NULL,
DROP COLUMN "room_id",
ADD COLUMN     "room_id" INTEGER NOT NULL,
DROP COLUMN "contract_id",
ADD COLUMN     "contract_id" INTEGER,
DROP COLUMN "reviewer_id",
ADD COLUMN     "reviewer_id" INTEGER NOT NULL,
ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_pkey",
DROP COLUMN "permission_id",
ADD COLUMN     "permission_id" INTEGER NOT NULL,
ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id", "permission_id");

-- AlterTable
ALTER TABLE "roles" DROP COLUMN "created_by_id",
ADD COLUMN     "created_by_id" INTEGER,
DROP COLUMN "deleted_by_id",
ADD COLUMN     "deleted_by_id" INTEGER,
DROP COLUMN "updated_by_id",
ADD COLUMN     "updated_by_id" INTEGER;

-- AlterTable
ALTER TABLE "room_amenities" DROP CONSTRAINT "room_amenities_pkey",
DROP COLUMN "room_id",
ADD COLUMN     "room_id" INTEGER NOT NULL,
DROP COLUMN "amenity_id",
ADD COLUMN     "amenity_id" INTEGER NOT NULL,
ADD CONSTRAINT "room_amenities_pkey" PRIMARY KEY ("room_id", "amenity_id");

-- AlterTable
ALTER TABLE "room_assets" DROP CONSTRAINT "room_assets_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER NOT NULL,
DROP COLUMN "room_id",
ADD COLUMN     "room_id" INTEGER NOT NULL,
DROP COLUMN "category_id",
ADD COLUMN     "category_id" INTEGER NOT NULL,
DROP COLUMN "created_by_id",
ADD COLUMN     "created_by_id" INTEGER,
DROP COLUMN "deleted_by_id",
ADD COLUMN     "deleted_by_id" INTEGER,
DROP COLUMN "updated_by_id",
ADD COLUMN     "updated_by_id" INTEGER,
ADD CONSTRAINT "room_assets_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "room_images" DROP CONSTRAINT "room_images_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "room_id",
ADD COLUMN     "room_id" INTEGER NOT NULL,
ADD CONSTRAINT "room_images_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "room_price_suggestions" DROP CONSTRAINT "room_price_suggestions_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER NOT NULL,
DROP COLUMN "room_id",
ADD COLUMN     "room_id" INTEGER NOT NULL,
ADD CONSTRAINT "room_price_suggestions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "room_view_logs" DROP CONSTRAINT "room_view_logs_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" INTEGER,
DROP COLUMN "room_id",
ADD COLUMN     "room_id" INTEGER NOT NULL,
ADD CONSTRAINT "room_view_logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "room_viewing_appointments" DROP CONSTRAINT "room_viewing_appointments_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER NOT NULL,
DROP COLUMN "room_id",
ADD COLUMN     "room_id" INTEGER NOT NULL,
DROP COLUMN "renter_id",
ADD COLUMN     "renter_id" INTEGER NOT NULL,
DROP COLUMN "assigned_staff_id",
ADD COLUMN     "assigned_staff_id" INTEGER,
DROP COLUMN "created_by_id",
ADD COLUMN     "created_by_id" INTEGER,
DROP COLUMN "deleted_by_id",
ADD COLUMN     "deleted_by_id" INTEGER,
DROP COLUMN "updated_by_id",
ADD COLUMN     "updated_by_id" INTEGER,
ADD CONSTRAINT "room_viewing_appointments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER NOT NULL,
DROP COLUMN "property_id",
ADD COLUMN     "property_id" INTEGER NOT NULL,
DROP COLUMN "floor_id",
ADD COLUMN     "floor_id" INTEGER,
DROP COLUMN "created_by_id",
ADD COLUMN     "created_by_id" INTEGER,
DROP COLUMN "deleted_by_id",
ADD COLUMN     "deleted_by_id" INTEGER,
DROP COLUMN "updated_by_id",
ADD COLUMN     "updated_by_id" INTEGER,
ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "subscription_payments" DROP CONSTRAINT "subscription_payments_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "subscription_id",
ADD COLUMN     "subscription_id" INTEGER NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER NOT NULL,
ADD CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER NOT NULL,
DROP COLUMN "plan_id",
ADD COLUMN     "plan_id" INTEGER NOT NULL,
ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "system_settings" DROP CONSTRAINT "system_settings_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "tenant_members" DROP CONSTRAINT "tenant_members_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" INTEGER NOT NULL,
ADD CONSTRAINT "tenant_members_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "tenants" DROP CONSTRAINT "tenants_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "owner_user_id",
ADD COLUMN     "owner_user_id" INTEGER NOT NULL,
DROP COLUMN "created_by_id",
ADD COLUMN     "created_by_id" INTEGER,
DROP COLUMN "deleted_by_id",
ADD COLUMN     "deleted_by_id" INTEGER,
DROP COLUMN "updated_by_id",
ADD COLUMN     "updated_by_id" INTEGER,
ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "ticket_attachments" DROP CONSTRAINT "ticket_attachments_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "ticket_id",
ADD COLUMN     "ticket_id" INTEGER NOT NULL,
DROP COLUMN "uploaded_by",
ADD COLUMN     "uploaded_by" INTEGER NOT NULL,
ADD CONSTRAINT "ticket_attachments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "ticket_comments" DROP CONSTRAINT "ticket_comments_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "ticket_id",
ADD COLUMN     "ticket_id" INTEGER NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" INTEGER NOT NULL,
ADD CONSTRAINT "ticket_comments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER NOT NULL,
DROP COLUMN "room_id",
ADD COLUMN     "room_id" INTEGER NOT NULL,
DROP COLUMN "contract_id",
ADD COLUMN     "contract_id" INTEGER,
DROP COLUMN "assigned_to",
ADD COLUMN     "assigned_to" INTEGER,
DROP COLUMN "created_by_id",
ADD COLUMN     "created_by_id" INTEGER,
DROP COLUMN "deleted_by_id",
ADD COLUMN     "deleted_by_id" INTEGER,
DROP COLUMN "updated_by_id",
ADD COLUMN     "updated_by_id" INTEGER,
ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "utility_meters" DROP CONSTRAINT "utility_meters_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" INTEGER NOT NULL,
DROP COLUMN "room_id",
ADD COLUMN     "room_id" INTEGER NOT NULL,
ADD CONSTRAINT "utility_meters_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "verification_codes" DROP CONSTRAINT "verification_codes_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "devices" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "user_agent" TEXT NOT NULL,
    "ip" VARCHAR(64) NOT NULL,
    "last_active_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "devices_user_id_idx" ON "devices"("user_id");

-- CreateIndex
CREATE INDEX "devices_is_active_idx" ON "devices"("is_active");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "background_jobs_tenant_id_idx" ON "background_jobs"("tenant_id");

-- CreateIndex
CREATE INDEX "contracts_tenant_id_idx" ON "contracts"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_user_id_token_key" ON "device_tokens"("user_id", "token");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_batches_tenant_id_billing_month_key" ON "invoice_batches"("tenant_id", "billing_month");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_billing_month_idx" ON "invoices"("tenant_id", "billing_month");

-- CreateIndex
CREATE INDEX "meter_readings_tenant_id_billing_month_idx" ON "meter_readings"("tenant_id", "billing_month");

-- CreateIndex
CREATE UNIQUE INDEX "meter_readings_meter_id_billing_month_key" ON "meter_readings"("meter_id", "billing_month");

-- CreateIndex
CREATE INDEX "payments_tenant_id_idx" ON "payments"("tenant_id");

-- CreateIndex
CREATE INDEX "properties_tenant_id_idx" ON "properties"("tenant_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_device_id_idx" ON "refresh_tokens"("device_id");

-- CreateIndex
CREATE UNIQUE INDEX "renter_profiles_user_id_key" ON "renter_profiles"("user_id");

-- CreateIndex
CREATE INDEX "rooms_property_id_idx" ON "rooms"("property_id");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_property_id_room_code_key" ON "rooms"("property_id", "room_code");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_members_tenant_id_user_id_key" ON "tenant_members"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "utility_meters_room_id_type_key" ON "utility_meters"("room_id", "type");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_members" ADD CONSTRAINT "tenant_members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_members" ADD CONSTRAINT "tenant_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floors" ADD CONSTRAINT "floors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floors" ADD CONSTRAINT "floors_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_floor_id_fkey" FOREIGN KEY ("floor_id") REFERENCES "floors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_images" ADD CONSTRAINT "room_images_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amenities" ADD CONSTRAINT "amenities_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amenities" ADD CONSTRAINT "amenities_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amenities" ADD CONSTRAINT "amenities_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_amenities" ADD CONSTRAINT "room_amenities_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_amenities" ADD CONSTRAINT "room_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renter_profiles" ADD CONSTRAINT "renter_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_histories" ADD CONSTRAINT "rental_histories_renter_id_fkey" FOREIGN KEY ("renter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_histories" ADD CONSTRAINT "rental_histories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_histories" ADD CONSTRAINT "rental_histories_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_histories" ADD CONSTRAINT "rental_histories_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_view_logs" ADD CONSTRAINT "room_view_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_view_logs" ADD CONSTRAINT "room_view_logs_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_rooms" ADD CONSTRAINT "favorite_rooms_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_rooms" ADD CONSTRAINT "favorite_rooms_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_viewing_appointments" ADD CONSTRAINT "room_viewing_appointments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_viewing_appointments" ADD CONSTRAINT "room_viewing_appointments_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_viewing_appointments" ADD CONSTRAINT "room_viewing_appointments_renter_id_fkey" FOREIGN KEY ("renter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_viewing_appointments" ADD CONSTRAINT "room_viewing_appointments_assigned_staff_id_fkey" FOREIGN KEY ("assigned_staff_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_viewing_appointments" ADD CONSTRAINT "room_viewing_appointments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_viewing_appointments" ADD CONSTRAINT "room_viewing_appointments_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_viewing_appointments" ADD CONSTRAINT "room_viewing_appointments_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_requests" ADD CONSTRAINT "rental_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_requests" ADD CONSTRAINT "rental_requests_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_requests" ADD CONSTRAINT "rental_requests_renter_id_fkey" FOREIGN KEY ("renter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_requests" ADD CONSTRAINT "rental_requests_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "room_viewing_appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_requests" ADD CONSTRAINT "rental_requests_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_requests" ADD CONSTRAINT "rental_requests_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_requests" ADD CONSTRAINT "rental_requests_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_templates" ADD CONSTRAINT "contract_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_templates" ADD CONSTRAINT "contract_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_templates" ADD CONSTRAINT "contract_templates_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_templates" ADD CONSTRAINT "contract_templates_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_renter_id_fkey" FOREIGN KEY ("renter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_rental_request_id_fkey" FOREIGN KEY ("rental_request_id") REFERENCES "rental_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "contract_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_members" ADD CONSTRAINT "contract_members_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_members" ADD CONSTRAINT "contract_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_files" ADD CONSTRAINT "contract_files_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_termination_requests" ADD CONSTRAINT "contract_termination_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_termination_requests" ADD CONSTRAINT "contract_termination_requests_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_termination_requests" ADD CONSTRAINT "contract_termination_requests_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_termination_requests" ADD CONSTRAINT "contract_termination_requests_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_termination_requests" ADD CONSTRAINT "contract_termination_requests_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_categories" ADD CONSTRAINT "asset_categories_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_categories" ADD CONSTRAINT "asset_categories_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_categories" ADD CONSTRAINT "asset_categories_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_assets" ADD CONSTRAINT "room_assets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_assets" ADD CONSTRAINT "room_assets_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_assets" ADD CONSTRAINT "room_assets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "asset_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_assets" ADD CONSTRAINT "room_assets_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_assets" ADD CONSTRAINT "room_assets_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_assets" ADD CONSTRAINT "room_assets_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handover_records" ADD CONSTRAINT "handover_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handover_records" ADD CONSTRAINT "handover_records_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handover_records" ADD CONSTRAINT "handover_records_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handover_records" ADD CONSTRAINT "handover_records_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handover_records" ADD CONSTRAINT "handover_records_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handover_records" ADD CONSTRAINT "handover_records_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handover_asset_items" ADD CONSTRAINT "handover_asset_items_handover_record_id_fkey" FOREIGN KEY ("handover_record_id") REFERENCES "handover_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handover_asset_items" ADD CONSTRAINT "handover_asset_items_room_asset_id_fkey" FOREIGN KEY ("room_asset_id") REFERENCES "room_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utility_meters" ADD CONSTRAINT "utility_meters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utility_meters" ADD CONSTRAINT "utility_meters_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_meter_id_fkey" FOREIGN KEY ("meter_id") REFERENCES "utility_meters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocr_jobs" ADD CONSTRAINT "ocr_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocr_jobs" ADD CONSTRAINT "ocr_jobs_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocr_jobs" ADD CONSTRAINT "ocr_jobs_meter_id_fkey" FOREIGN KEY ("meter_id") REFERENCES "utility_meters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocr_jobs" ADD CONSTRAINT "ocr_jobs_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_batches" ADD CONSTRAINT "invoice_batches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_batches" ADD CONSTRAINT "invoice_batches_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_batches" ADD CONSTRAINT "invoice_batches_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_batches" ADD CONSTRAINT "invoice_batches_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "invoice_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_renter_id_fkey" FOREIGN KEY ("renter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_meter_reading_id_fkey" FOREIGN KEY ("meter_reading_id") REFERENCES "meter_readings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_qr_codes" ADD CONSTRAINT "payment_qr_codes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_qr_codes" ADD CONSTRAINT "payment_qr_codes_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_webhook_logs" ADD CONSTRAINT "payment_webhook_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_webhook_logs" ADD CONSTRAINT "payment_webhook_logs_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reputation_scores" ADD CONSTRAINT "reputation_scores_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reputation_scores" ADD CONSTRAINT "reputation_scores_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_handled_by_fkey" FOREIGN KEY ("handled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_recommendation_logs" ADD CONSTRAINT "ai_recommendation_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_recommendation_logs" ADD CONSTRAINT "ai_recommendation_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_price_suggestions" ADD CONSTRAINT "room_price_suggestions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_price_suggestions" ADD CONSTRAINT "room_price_suggestions_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_sessions" ADD CONSTRAINT "chatbot_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_sessions" ADD CONSTRAINT "chatbot_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_messages" ADD CONSTRAINT "chatbot_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chatbot_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "background_jobs" ADD CONSTRAINT "background_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
