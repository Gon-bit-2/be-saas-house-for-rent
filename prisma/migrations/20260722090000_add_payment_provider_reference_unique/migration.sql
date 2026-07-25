DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM payments
    WHERE provider IS NOT NULL AND transaction_code IS NOT NULL
    GROUP BY provider, transaction_code
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate payment provider references must be reconciled before this migration';
  END IF;
END
$$;

CREATE UNIQUE INDEX "payments_provider_transaction_code_key"
ON "payments"("provider", "transaction_code");
