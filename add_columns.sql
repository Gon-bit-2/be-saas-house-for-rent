ALTER TYPE "InvoiceItemType" ADD VALUE IF NOT EXISTS 'DEPOSIT';

ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS is_deposit_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deposit_invoice_id INTEGER;

-- Tạo index unique riêng nếu cần cho deposit_invoice_id (tuỳ thuộc quy chuẩn của database của bạn, Prisma dùng unique)
-- CREATE UNIQUE INDEX IF NOT EXISTS contracts_deposit_invoice_id_key ON contracts(deposit_invoice_id);
