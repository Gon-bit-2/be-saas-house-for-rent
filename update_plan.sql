-- Thêm các trường giấy tờ xác minh cho Tenant
ALTER TABLE "tenants" 
ADD COLUMN "id_card_front_url" TEXT,
ADD COLUMN "id_card_back_url" TEXT,
ADD COLUMN "portrait_url" TEXT;

-- Thêm trường mảng giấy tờ khu trọ cho Property
-- Lưu ý: verification_documents là mảng String nên kiểu dữ liệu là TEXT[]
ALTER TABLE "properties"
ADD COLUMN "verification_documents" TEXT[];
