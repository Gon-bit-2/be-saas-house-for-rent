ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MARKETPLACE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RENTAL_REQUEST';

ALTER TABLE "ticket_attachments"
ADD COLUMN "public_id" VARCHAR(255);

CREATE UNIQUE INDEX "rental_requests_active_renter_room_key"
ON "rental_requests" ("renter_id", "room_id")
WHERE "status" IN ('PENDING', 'NEED_MORE_INFO', 'APPROVED');
