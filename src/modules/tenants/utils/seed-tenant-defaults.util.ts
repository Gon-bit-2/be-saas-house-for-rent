import { Prisma } from 'generated/prisma/client'

const DEFAULT_SERVICES = [
  { code: 'DIEN', name: 'Tiền Điện', description: 'Tính theo chỉ số công tơ điện (kWh)', unitLabel: 'kWh' },
  { code: 'NUOC', name: 'Tiền Nước', description: 'Tính theo khối nước (m3)', unitLabel: 'Khối' },
  { code: 'RAC', name: 'Tiền Rác', description: 'Phí thu gom rác sinh hoạt', unitLabel: 'Phòng/Tháng' },
  { code: 'WIFI', name: 'Tiền Internet (Wifi)', description: 'Phí sử dụng mạng Internet', unitLabel: 'Phòng/Tháng' },
  { code: 'GUI_XE', name: 'Phí gửi xe', description: 'Phí trông giữ xe máy/xe đạp', unitLabel: 'Xe/Tháng' },
  { code: 'QUAN_LY', name: 'Phí quản lý', description: 'Phí quản lý vận hành khu trọ', unitLabel: 'Phòng/Tháng' },
  {
    code: 'VE_SINH',
    name: 'Phí vệ sinh chung',
    description: 'Phí dọn dẹp vệ sinh khu vực chung',
    unitLabel: 'Phòng/Tháng',
  },
]

const DEFAULT_ASSET_CATEGORIES = [
  { name: 'Giường', description: 'Giường ngủ các loại' },
  { name: 'Tủ quần áo', description: 'Tủ đựng quần áo' },
  { name: 'Máy lạnh (Điều hòa)', description: 'Máy điều hòa nhiệt độ' },
  { name: 'Tủ lạnh', description: 'Tủ lạnh bảo quản thức ăn' },
  { name: 'Máy giặt', description: 'Máy giặt quần áo' },
  { name: 'Quạt', description: 'Quạt máy (quạt trần, quạt treo tường, quạt đứng)' },
  { name: 'Bàn ghế', description: 'Bàn ghế làm việc, bàn ăn' },
  { name: 'Nệm', description: 'Nệm trải giường' },
  { name: 'Bếp', description: 'Bếp ga, bếp từ, kệ bếp' },
  { name: 'Bình nóng lạnh', description: 'Bình nước nóng trong phòng tắm' },
  { name: 'Chìa khóa / Thẻ từ', description: 'Chìa khóa phòng, chìa khóa cổng, thẻ thang máy' },
  { name: 'Thiết bị vệ sinh', description: 'Bồn cầu, lavabo, vòi hoa sen' },
  { name: 'Rèm cửa', description: 'Rèm che nắng cửa sổ' },
  { name: 'Đồng hồ điện', description: 'Công tơ điện riêng của phòng' },
  { name: 'Đồng hồ nước', description: 'Đồng hồ nước riêng của phòng' },
]

export async function seedTenantDefaults(tx: Prisma.TransactionClient, tenantId: number, adminUserId?: number) {
  // Create default services
  await tx.serviceCatalogItem.createMany({
    data: DEFAULT_SERVICES.map((service) => ({
      ...service,
      tenantId,
      defaultUnitPrice: 0,
      itemType: 'SERVICE',
      isActive: true,
    })),
    skipDuplicates: true,
  })

  // Create default asset categories
  await tx.assetCategory.createMany({
    data: DEFAULT_ASSET_CATEGORIES.map((category) => ({
      ...category,
      tenantId,
      createdById: adminUserId ?? null,
    })),
    skipDuplicates: true,
  })
}
