import { Module } from '@nestjs/common';
import { TenantMembersService } from './tenant-members.service';
import { TenantMembersController } from './tenant-members.controller';
import { TenantMembersRepository } from './repo/tenant-members.repo';

@Module({
  controllers: [TenantMembersController],
  providers: [TenantMembersService, TenantMembersRepository],
})
export class TenantMembersModule {}
