-- Xóa ràng buộc NOT NULL của trường user_id
ALTER TABLE "contract_members" ALTER COLUMN "user_id" DROP NOT NULL;

-- Thêm các trường thông tin cho người ở cùng không dùng app
ALTER TABLE "contract_members" 
ADD COLUMN "full_name" VARCHAR(255),
ADD COLUMN "phone" VARCHAR(50),
ADD COLUMN "age" INTEGER,
ADD COLUMN "identity_card" VARCHAR(50),
ADD COLUMN "identity_card_image_url" TEXT;

-- Xóa ràng buộc UNIQUE trên (contract_id, user_id) nếu có
ALTER TABLE "contract_members" DROP CONSTRAINT IF EXISTS "contract_members_contract_id_user_id_key";

-- (Tùy chọn) Thêm index để tối ưu tìm kiếm
CREATE INDEX IF NOT EXISTS "contract_members_contract_id_idx" ON "contract_members"("contract_id");
CREATE INDEX IF NOT EXISTS "contract_members_user_id_idx" ON "contract_members"("user_id");
