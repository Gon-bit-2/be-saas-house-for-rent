import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const tenants = await prisma.tenant.findMany({
    take: 1,
    orderBy: { id: 'desc' },
  })

  if (!tenants.length) {
    console.log('No tenant found')
    return
  }
  const tenant = tenants[0]

  let property = await prisma.property.findFirst({
    where: { tenantId: tenant.id },
  })

  if (!property) {
    property = await prisma.property.create({
      data: {
        tenantId: tenant.id,
        name: 'Khu trọ Test',
        type: 'MINI_APARTMENT',
        province: 'Hà Nội',
        district: 'Cầu Giấy',
        ward: 'Dịch Vọng',
        addressDetail: '123 Test',
        status: 'ACTIVE',
      },
    })
  }

  const room = await prisma.room.create({
    data: {
      tenantId: tenant.id,
      propertyId: property.id,
      roomCode: 'TEST10K',
      title: 'Phòng Test 10k',
      basePrice: 10000,
      depositAmount: 0,
      electricityPrice: 3500,
      waterPrice: 20000,
      area: 20,
      maxOccupants: 2,
      status: 'AVAILABLE',
    },
  })

  console.log('CREATED_ROOM_ID=' + room.id)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
