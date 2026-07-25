-- Add marketplace moderation history without changing existing room states.
CREATE TABLE "marketplace_moderations" (
    "id" SERIAL NOT NULL,
    "room_id" INTEGER NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "actor_id" INTEGER,
    "from_status" "MarketplaceStatus",
    "to_status" "MarketplaceStatus" NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_moderations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "marketplace_moderations_room_id_created_at_idx"
ON "marketplace_moderations"("room_id", "created_at");

CREATE INDEX "marketplace_moderations_tenant_id_created_at_idx"
ON "marketplace_moderations"("tenant_id", "created_at");

CREATE INDEX "marketplace_moderations_to_status_created_at_idx"
ON "marketplace_moderations"("to_status", "created_at");

CREATE INDEX "rooms_marketplace_status_updated_at_idx"
ON "rooms"("marketplace_status", "updated_at");

ALTER TABLE "marketplace_moderations"
ADD CONSTRAINT "marketplace_moderations_room_id_fkey"
FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "marketplace_moderations"
ADD CONSTRAINT "marketplace_moderations_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "marketplace_moderations"
ADD CONSTRAINT "marketplace_moderations_actor_id_fkey"
FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
