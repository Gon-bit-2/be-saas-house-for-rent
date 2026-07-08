import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { AuthRepository } from './repositories/auth.repo'

/**
 * Module xác thực người dùng.
 * Đăng ký AuthController, AuthService và AuthRepository.
 * HashingService và TokenService được inject từ SharedServiceModule (global).
 */
@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepository],
})
export class AuthModule {}
