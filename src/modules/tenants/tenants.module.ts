import { Module } from '@nestjs/common'
import { TenantsController } from './tenants.controller'
import { TenantsRepository } from './repositories/tenants.repo'
import { TenantsService } from './tenants.service'

@Module({
  controllers: [TenantsController],
  providers: [TenantsService, TenantsRepository],
  exports: [TenantsService, TenantsRepository],
})
export class TenantsModule {}
