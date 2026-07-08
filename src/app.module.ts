import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { DatabaseModule } from './shared/modules/database/prisma.module'
import { SharedServiceModule } from './shared/modules/services/shared-service.module'
import { AuthModule } from './modules/auth/auth.module'

@Module({
  imports: [DatabaseModule, SharedServiceModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

