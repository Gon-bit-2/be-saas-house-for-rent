import { Module } from '@nestjs/common'
import { SharedServiceModule } from '@src/shared/modules/services/shared-service.module'
import { MeterReadingsController } from './meter-readings.controller'
import { MeterReadingsService } from './meter-readings.service'
import { UtilityMetersRepository } from './repositories/utility-meters.repo'
import { UtilityMetersController } from './utility-meters.controller'
import { UtilityMetersService } from './utility-meters.service'

/**
 * Module for utility meter configuration and manual meter readings.
 */
@Module({
  imports: [SharedServiceModule],
  controllers: [UtilityMetersController, MeterReadingsController],
  providers: [UtilityMetersService, MeterReadingsService, UtilityMetersRepository],
  exports: [MeterReadingsService],
})
export class UtilityMetersModule {}
