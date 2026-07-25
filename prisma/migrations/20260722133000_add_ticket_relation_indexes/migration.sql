CREATE INDEX "ticket_attachments_ticket_id_created_at_id_idx"
  ON "ticket_attachments"("ticket_id", "created_at", "id");

CREATE INDEX "ticket_comments_ticket_id_is_internal_created_at_id_idx"
  ON "ticket_comments"("ticket_id", "is_internal", "created_at", "id");
