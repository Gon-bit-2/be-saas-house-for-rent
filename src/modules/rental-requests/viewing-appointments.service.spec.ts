import { BadRequestException, NotFoundException } from '@nestjs/common'

jest.mock('@src/shared/modules/services/tenant-access.service', () => ({ TenantAccessService: class TenantAccessService {} }))
jest.mock('./repositories/rental-requests.repo', () => ({ RentalRequestsRepository: class RentalRequestsRepository {} }))
const { ViewingAppointmentsService } = require('./viewing-appointments.service') as typeof import('./viewing-appointments.service')

describe('ViewingAppointmentsService', () => {
  let service: import('./viewing-appointments.service').ViewingAppointmentsService
  let rentalRequestsRepository: Record<string, jest.Mock>
  let tenantAccessService: Record<string, jest.Mock>

  beforeEach(() => {
    rentalRequestsRepository = {
      findAppointmentsAndCount: jest.fn(),
      findTenantAppointment: jest.fn(),
      findActiveTenantMember: jest.fn(),
      updateAppointment: jest.fn(),
      findMyAppointmentsAndCount: jest.fn(),
      findRenterAppointment: jest.fn(),
      cancelRenterAppointment: jest.fn(),
    }
    tenantAccessService = {
      getActiveTenantContext: jest.fn().mockResolvedValue({ tenantId: 10, userId: 50, memberId: 1, roleId: 'LANDLORD' }),
    }
    service = new ViewingAppointmentsService(rentalRequestsRepository as never, tenantAccessService as never)
    jest.useFakeTimers().setSystemTime(new Date('2026-07-09T08:00:00.000Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('requires a future scheduledAt when rescheduling', async () => {
    rentalRequestsRepository.findTenantAppointment.mockResolvedValue({ id: 3, status: 'PENDING' })

    await expect(service.updateStatus(50, 3, { status: 'RESCHEDULED' })).rejects.toBeInstanceOf(BadRequestException)
    await expect(
      service.updateStatus(50, 3, { status: 'CONFIRMED', scheduledAt: new Date('2026-07-09T07:59:00.000Z') }),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(rentalRequestsRepository.updateAppointment).not.toHaveBeenCalled()
  })

  it('rejects assigned staff outside the active tenant', async () => {
    rentalRequestsRepository.findTenantAppointment.mockResolvedValue({ id: 3, status: 'PENDING' })
    rentalRequestsRepository.findActiveTenantMember.mockResolvedValue(null)

    await expect(service.updateStatus(50, 3, { status: 'CONFIRMED', assignedStaffId: 12 })).rejects.toBeInstanceOf(
      BadRequestException,
    )
    expect(rentalRequestsRepository.updateAppointment).not.toHaveBeenCalled()
  })

  it('updates appointment status for a valid tenant appointment', async () => {
    rentalRequestsRepository.findTenantAppointment.mockResolvedValue({ id: 3, status: 'PENDING' })
    rentalRequestsRepository.findActiveTenantMember.mockResolvedValue({ id: 12 })
    rentalRequestsRepository.updateAppointment.mockResolvedValue({ id: 3, status: 'CONFIRMED' })

    await service.updateStatus(50, 3, { status: 'CONFIRMED', assignedStaffId: 12, landlordNote: 'OK' })

    expect(rentalRequestsRepository.updateAppointment).toHaveBeenCalledWith(10, 3, {
      status: 'CONFIRMED',
      scheduledAt: undefined,
      assignedStaffId: 12,
      landlordNote: 'OK',
      updatedById: 50,
    })
  })

  it('lets renter cancel non-terminal appointments only', async () => {
    rentalRequestsRepository.findRenterAppointment.mockResolvedValue({ id: 3, status: 'PENDING' })
    rentalRequestsRepository.cancelRenterAppointment.mockResolvedValue({ id: 3, status: 'CANCELED' })

    await service.cancelMine(99, 3, {})

    expect(rentalRequestsRepository.cancelRenterAppointment).toHaveBeenCalledWith(3, 99)
  })

  it('throws not found when appointment does not belong to current tenant', async () => {
    rentalRequestsRepository.findTenantAppointment.mockResolvedValue(null)

    await expect(service.updateStatus(50, 3, { status: 'CONFIRMED' })).rejects.toBeInstanceOf(NotFoundException)
  })
})
