jest.mock('@src/shared/modules/database/prisma.service', () => ({ PrismaService: class PrismaService {} }))
import { ReportsRepository } from './reports.repo'

describe('ReportsRepository target resolver', () => {
  const prisma = {
    room: { findFirst: jest.fn() },
    tenant: { findFirst: jest.fn() },
    review: { findFirst: jest.fn() },
    user: { findFirst: jest.fn() },
  }
  const repository = new ReportsRepository(prisma as never)

  beforeEach(() => jest.clearAllMocks())

  it('resolves a public room snapshot', async () => {
    prisma.room.findFirst.mockResolvedValue({
      id: 1,
      tenantId: 2,
      title: 'Phòng 1',
      roomCode: 'P1',
      marketplaceStatus: 'PUBLISHED',
    })

    const result = await repository.findTarget('ROOM', 1)

    expect(result).toEqual(expect.objectContaining({ targetTenantId: 2, ownerId: null }))
    expect(prisma.room.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ marketplaceStatus: 'PUBLISHED', deletedAt: null }) }),
    )
  })

  it('resolves a tenant snapshot', async () => {
    prisma.tenant.findFirst.mockResolvedValue({
      id: 2,
      name: 'Tenant 2',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
    })
    const result = await repository.findTarget('TENANT', 2)
    expect(result).toEqual(expect.objectContaining({ targetTenantId: 2, ownerId: null }))
  })

  it('resolves only a public review and keeps its owner for self-report protection', async () => {
    prisma.review.findFirst.mockResolvedValue({
      id: 3,
      tenantId: 2,
      roomId: 1,
      reviewerId: 40,
      rating: 5,
      content: 'Nội dung công khai',
      status: 'APPROVED',
    })
    const result = await repository.findTarget('REVIEW', 3)
    expect(result).toEqual(expect.objectContaining({ targetTenantId: 2, ownerId: 40 }))
    expect(prisma.review.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 3, status: 'APPROVED', isVisible: true }),
      }),
    )
  })

  it('resolves an active user and returns null for missing targets', async () => {
    prisma.user.findFirst.mockResolvedValueOnce({ id: 40, fullName: 'Nguyen Van A', status: 'ACTIVE' })
    expect(await repository.findTarget('USER', 40)).toEqual(expect.objectContaining({ ownerId: 40 }))

    prisma.user.findFirst.mockResolvedValueOnce(null)
    expect(await repository.findTarget('USER', 41)).toBeNull()
  })
})
