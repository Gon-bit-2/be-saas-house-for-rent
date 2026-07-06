import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { DatabaseModule } from './shared/modules/database/prisma.module'
import { SharedServiceModule } from './shared/modules/services/shared-service.module'

@Module({
  imports: [DatabaseModule, SharedServiceModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
