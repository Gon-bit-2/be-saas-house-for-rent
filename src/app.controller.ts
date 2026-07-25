import { Controller, Get } from '@nestjs/common'
import { AppService } from './app.service'
import { isPublic } from './common/decorators/decorators/auth.decorator'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Public health endpoint used by local checks and uptime probes.
   */
  @isPublic()
  @Get()
  getHello(): string {
    return this.appService.getHello()
  }
}
