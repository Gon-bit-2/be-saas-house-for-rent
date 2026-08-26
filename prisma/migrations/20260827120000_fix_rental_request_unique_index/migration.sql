DROP INDEX IF EXISTS "rental_requests_active_renter_room_key";

CREATE UNIQUE INDEX "rental_requests_active_renter_room_key"
ON "rental_requests" ("renter_id", "room_id")
WHERE "status" IN ('PENDING', 'NEED_MORE_INFO');
