import { Module } from '@nestjs/common'
import { AdminRentersController, UsersController } from './users.controller'
import { UsersRepository } from './repositories/users.repo'
import { UsersService } from './users.service'

@Module({
  controllers: [UsersController, AdminRentersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
