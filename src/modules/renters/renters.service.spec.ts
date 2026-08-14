import { NotFoundException } from '@nestjs/common'
import { BadRequestException } from '@nestjs/common'

jest.mock('@src/shared/modules/services/tenant-access.service', () => ({
  TenantAccessService: class TenantAccessService {},
}))
jest.mock('./repositories/renters.repo', () => ({ RentersRepository: class RentersRepository {} }))
const { RentersService } = require('./renters.service') as typeof import('./renters.service')

describe('RentersService', () => {
  let service: import('./renters.service').RentersService
  let rentersRepository: Record<string, jest.Mock>
  let tenantAccessService: Record<string, jest.Mock>
  let hashingService: Record<string, jest.Mock>
  let emailService: Record<string, jest.Mock>

  beforeEach(() => {
    rentersRepository = {
      findMe: jest.fn(),
      updateProfile: jest.fn(),
      findManyAndCount: jest.fn(),
      findTenantRenter: jest.fn(),
      findInvitation: jest.fn(),
    }
    tenantAccessService = {
      getActiveTenantContext: jest
        .fn()
        .mockResolvedValue({ tenantId: 10, userId: 50, memberId: 1, roleId: 'LANDLORD' }),
    }
    hashingService = { hash: jest.fn(), compare: jest.fn() }
    emailService = { sendOtpEmail: jest.fn() }
    service = new RentersService(
      rentersRepository as never,
      tenantAccessService as never,
      hashingService as never,
      emailService as never,
    )
  })

  it('updates renter self profile after confirming profile exists', async () => {
    rentersRepository.findMe.mockResolvedValue({ id: 99, renterProfile: { id: 1 } })
    rentersRepository.updateProfile.mockResolvedValue({ id: 99 })

    await service.updateMe(99, { occupation: 'Developer', identityNumber: null })

    expect(rentersRepository.updateProfile).toHaveBeenCalledWith(99, {
      dateOfBirth: undefined,
      gender: undefined,
      identityNumber: null,
      identityFrontUrl: undefined,
      identityBackUrl: undefined,
      permanentAddress: undefined,
      occupation: 'Developer',
      emergencyContactName: undefined,
      emergencyContactPhone: undefined,
    })
  })

  it('throws when tenant user has no renter profile', async () => {
    rentersRepository.findMe.mockResolvedValue({ id: 99, renterProfile: null })

    await expect(service.getMe(99)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('lists renters only through current tenant relationships', async () => {
    rentersRepository.findManyAndCount.mockResolvedValue([[{ id: 99 }], 1])

    await service.listForLandlord(50, { page: 1, limit: 20, search: 'An' })

    expect(rentersRepository.findManyAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        AND: expect.arrayContaining([
          {
            OR: expect.arrayContaining([
              { rentalRequests: { some: { tenantId: 10 } } },
              { viewingAppointments: { some: { tenantId: 10 } } },
              { contracts: { some: { tenantId: 10, deletedAt: null } } },
              { rentalHistories: { some: { tenantId: 10 } } },
            ]),
          },
        ]),
      }),
      0,
      20,
    )
  })

  it('throws when landlord requests unrelated renter detail', async () => {
    rentersRepository.findTenantRenter.mockResolvedValue(null)

    await expect(service.getForLandlord(50, 99)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('creates a tenant-scoped invitation and emails a six-digit code', async () => {
    rentersRepository.findRegisteredUser = jest.fn().mockResolvedValue(null)
    rentersRepository.createInvitation = jest
      .fn()
      .mockResolvedValue({ id: 7, tenantId: 10, email: 'renter@example.com' })
    hashingService.hash.mockResolvedValue('hashed-code')

    const result = await service.invite(50, {
      fullName: 'Nguyen Van A',
      email: ' RENTER@example.com ',
      phone: '0900000000',
    })

    expect(rentersRepository.createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 10, email: 'renter@example.com', codeHash: 'hashed-code', createdById: 50 }),
    )
    expect(emailService.sendOtpEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'renter@example.com', code: expect.stringMatching(/^\d{6}$/) }),
    )
    expect(result).toEqual(expect.objectContaining({ id: 7 }))
  })

  it.each([
    [
      {
        acceptedAt: new Date('2026-07-01T00:00:00.000Z'),
        revokedAt: new Date('2026-06-30T00:00:00.000Z'),
        expiresAt: new Date('2026-07-02T00:00:00.000Z'),
      },
      'ACCEPTED',
    ],
    [
      {
        acceptedAt: null,
        revokedAt: new Date('2026-07-01T00:00:00.000Z'),
        expiresAt: new Date('2026-07-02T00:00:00.000Z'),
      },
      'CANCELED',
    ],
    [{ acceptedAt: null, revokedAt: null, expiresAt: new Date('2026-07-01T00:00:00.000Z') }, 'EXPIRED'],
    [{ acceptedAt: null, revokedAt: null, expiresAt: new Date('2026-07-20T00:00:00.000Z') }, 'PENDING'],
  ])('returns invitation status %s as %s without secret fields', async (dates, status) => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-10T00:00:00.000Z'))
    rentersRepository.findInvitation.mockResolvedValue({
      id: 7,
      tenantId: 10,
      email: 'renter@example.com',
      ...dates,
      tenant: { id: 10, name: 'Nha Tro A' },
      createdBy: { id: 50, fullName: 'Landlord', email: 'owner@example.com' },
    })

    const result = await service.getInvitation(50, 7)

    expect(rentersRepository.findInvitation).toHaveBeenCalledWith(10, 7)
    expect(result).toEqual(expect.objectContaining({ id: 7, status }))
    expect(result).not.toHaveProperty('codeHash')
    expect(result).not.toHaveProperty('attempts')
    jest.useRealTimers()
  })

  it('throws when invitation does not belong to the active tenant', async () => {
    rentersRepository.findInvitation.mockResolvedValue(null)

    await expect(service.getInvitation(50, 7)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('records a failed invitation code attempt', async () => {
    rentersRepository.findRegisteredUser = jest.fn().mockResolvedValue(null)
    rentersRepository.findValidInvitation = jest.fn().mockResolvedValue({ id: 7, codeHash: 'hash' })
    rentersRepository.recordInvitationFailure = jest.fn()
    hashingService.compare.mockResolvedValue(false)

    await expect(
      service.acceptInvitation({
        email: 'renter@example.com',
        code: '000000',
        password: 'Strong@123',
        confirmPassword: 'Strong@123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(rentersRepository.recordInvitationFailure).toHaveBeenCalledWith(7, expect.any(Number))
  })

  it('hashes the renter-chosen password before atomically accepting an invitation', async () => {
    rentersRepository.findRegisteredUser = jest.fn().mockResolvedValue(null)
    rentersRepository.findValidInvitation = jest.fn().mockResolvedValue({ id: 7, codeHash: 'code-hash' })
    rentersRepository.acceptInvitation = jest.fn().mockResolvedValue({ id: 99, email: 'renter@example.com' })
    hashingService.compare.mockResolvedValue(true)
    hashingService.hash.mockResolvedValue('password-hash')

    await service.acceptInvitation({
      email: 'renter@example.com',
      code: '123456',
      password: 'Strong@123',
      confirmPassword: 'Strong@123',
    })

    expect(rentersRepository.acceptInvitation).toHaveBeenCalledWith(7, 'renter@example.com', 'password-hash')
  })
})
