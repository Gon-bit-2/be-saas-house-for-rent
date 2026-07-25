import { Module } from '@nestjs/common'
import { RentalRequestsController } from './rental-requests.controller'
import { RentalRequestsService } from './rental-requests.service'
import { RentalRequestsRepository } from './repositories/rental-requests.repo'
import { ViewingAppointmentsController } from './viewing-appointments.controller'
import { ViewingAppointmentsService } from './viewing-appointments.service'

@Module({
  controllers: [RentalRequestsController, ViewingAppointmentsController],
  providers: [RentalRequestsService, ViewingAppointmentsService, RentalRequestsRepository],
  exports: [RentalRequestsService, ViewingAppointmentsService, RentalRequestsRepository],
})
export class RentalRequestsModule {}
