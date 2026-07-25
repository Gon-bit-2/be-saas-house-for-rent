import { NotFoundException } from '@nestjs/common'

jest.mock('./repositories/users.repo', () => ({ UsersRepository: class UsersRepository {} }))
const { UsersService } = require('./users.service') as typeof import('./users.service')

describe('UsersService', () => {
  let service: import('./users.service').UsersService
  let usersRepository: Record<string, jest.Mock>

  beforeEach(() => {
    usersRepository = {
      findMany: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
    }
    service = new UsersService(usersRepository as never)
  })

  it('lists landlord accounts with pagination', async () => {
    usersRepository.findMany.mockResolvedValue([[{ id: 1 }], 1])

    const result = await service.listLandlords({ page: 2, limit: 5, status: 'ACTIVE' })

    expect(result).toEqual({ data: [{ id: 1 }], meta: { page: 2, limit: 5, total: 1, totalPages: 1 } })
    expect(usersRepository.findMany).toHaveBeenCalledWith(expect.objectContaining({ status: 'ACTIVE' }), 5, 5)
  })

  it('updates a user status after verifying the user exists', async () => {
    usersRepository.findById.mockResolvedValue({ id: 1, status: 'ACTIVE' })
    usersRepository.update.mockResolvedValue({ id: 1, status: 'BANNED' })

    const result = await service.updateStatus(99, 1, { status: 'BANNED', reason: 'Vi phạm quy định' })

    expect(result).toEqual({ id: 1, status: 'BANNED' })
    expect(usersRepository.update).toHaveBeenCalledWith(1, 'ACTIVE', 'BANNED', 99, 'Vi phạm quy định')
  })

  it('does not write audit again when status is unchanged', async () => {
    usersRepository.findById.mockResolvedValue({ id: 1, status: 'INACTIVE' })

    const result = await service.updateStatus(99, 1, { status: 'INACTIVE', reason: 'Giữ nguyên trạng thái' })

    expect(result).toEqual({ id: 1, status: 'INACTIVE' })
    expect(usersRepository.update).not.toHaveBeenCalled()
  })

  it('throws when updating a missing user', async () => {
    usersRepository.findById.mockResolvedValue(null)

    await expect(
      service.updateStatus(99, 404, { status: 'INACTIVE', reason: 'Khóa tài khoản' }),
    ).rejects.toBeInstanceOf(NotFoundException)
    expect(usersRepository.update).not.toHaveBeenCalled()
  })
})
