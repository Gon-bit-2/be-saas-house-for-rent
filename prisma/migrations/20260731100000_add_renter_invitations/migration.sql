CREATE TABLE "renter_invitations" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "code_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "accepted_at" TIMESTAMPTZ,
    "accepted_user_id" INTEGER,
    "revoked_at" TIMESTAMPTZ,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "renter_invitations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "renter_invitations_tenant_id_email_idx"
    ON "renter_invitations"("tenant_id", "email");

CREATE INDEX "renter_invitations_email_expires_at_idx"
    ON "renter_invitations"("email", "expires_at");

CREATE INDEX "renter_invitations_accepted_user_id_idx"
    ON "renter_invitations"("accepted_user_id");

ALTER TABLE "renter_invitations"
    ADD CONSTRAINT "renter_invitations_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "renter_invitations"
    ADD CONSTRAINT "renter_invitations_accepted_user_id_fkey"
    FOREIGN KEY ("accepted_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "renter_invitations"
    ADD CONSTRAINT "renter_invitations_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
