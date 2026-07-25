import { Module } from '@nestjs/common'
import { RentersController } from './renters.controller'
import { RentersRepository } from './repositories/renters.repo'
import { RentersService } from './renters.service'

@Module({
  controllers: [RentersController],
  providers: [RentersService, RentersRepository],
  exports: [RentersService, RentersRepository],
})
export class RentersModule {}
