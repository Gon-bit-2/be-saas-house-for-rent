import { Module } from '@nestjs/common'
import { PropertiesController } from './properties.controller'
import { PropertiesService } from './properties.service'
import { PropertiesRepository } from './repositories/properties.repo'

@Module({
  controllers: [PropertiesController],
  providers: [PropertiesService, PropertiesRepository],
  exports: [PropertiesService, PropertiesRepository],
})
export class PropertiesModule {}
