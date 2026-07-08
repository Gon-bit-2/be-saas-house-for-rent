import { Global, Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { HashingService } from './hashing.service'
import { TokenService } from './token.service'
import { EmailService } from './email.service'

@Global()
@Module({
  imports: [JwtModule],
  providers: [HashingService, TokenService, EmailService],
  exports: [HashingService, TokenService, EmailService],
})
export class SharedServiceModule {}

