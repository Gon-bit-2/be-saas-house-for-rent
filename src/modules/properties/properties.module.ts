import { Module } from '@nestjs/common'
import { LocationsModule } from '../locations/locations.module'
import { PropertiesController } from './properties.controller'
import { PropertiesService } from './properties.service'
import { PropertiesRepository } from './repositories/properties.repo'

@Module({
  imports: [LocationsModule],
  controllers: [PropertiesController],
  providers: [PropertiesService, PropertiesRepository],
  exports: [PropertiesService, PropertiesRepository],
})
export class PropertiesModule {}
