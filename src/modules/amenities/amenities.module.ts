import { Module } from '@nestjs/common'
import { AmenitiesController } from './amenities.controller'
import { AmenitiesService } from './amenities.service'
import { AmenitiesRepository } from './repositories/amenities.repo'

@Module({
  controllers: [AmenitiesController],
  providers: [AmenitiesService, AmenitiesRepository],
  exports: [AmenitiesService, AmenitiesRepository],
})
export class AmenitiesModule {}
