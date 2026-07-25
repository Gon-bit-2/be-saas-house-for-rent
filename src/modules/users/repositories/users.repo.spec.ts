jest.mock('@src/shared/modules/database/prisma.service', () => ({ PrismaService: class PrismaService {} }))
const { UsersRepository } = require('./users.repo') as typeof import('./users.repo')

describe('UsersRepository', () => {
  it('updates status, writes audit, and revokes refresh tokens atomically', async () => {
    const tx = {
      user: { update: jest.fn().mockResolvedValue({ id: 5, status: 'INACTIVE' }) },
      auditLog: { create: jest.fn() },
      refreshToken: { updateMany: jest.fn() },
    }
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) }
    const repository = new UsersRepository(prisma as never)

    await repository.update(5, 'ACTIVE', 'INACTIVE', 99, 'Tạm khóa để xác minh')

    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 99,
        action: 'UPDATE_LANDLORD_STATUS',
        entityId: '5',
        oldValues: { status: 'ACTIVE' },
        newValues: { status: 'INACTIVE', reason: 'Tạm khóa để xác minh' },
      }),
    })
    expect(tx.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 5, revokedAt: null } }),
    )
  })
})
