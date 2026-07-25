import { Module } from '@nestjs/common'
import { UsersController } from './users.controller'
import { UsersRepository } from './repositories/users.repo'
import { UsersService } from './users.service'

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
