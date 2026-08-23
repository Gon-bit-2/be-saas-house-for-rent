import { Controller, Get, Param, ParseIntPipe, Post, Req } from '@nestjs/common'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { Auth } from '@src/common/decorators/decorators/auth.decorator'
import { AuthType, ConditionGuard } from '@src/common/constants/auth.constant'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import type { Request } from 'express'
import { ViewLogService } from './view-log.service'

@Controller('marketplace')
export class ViewLogController {
  constructor(private readonly viewLogService: ViewLogService) {}

  @Get('view-history')
  getViewHistory(@ActiveUser() user: AccessTokenPayload) {
    return this.viewLogService.getViewHistory(user.userId)
  }

  @Auth([AuthType.Bearer, AuthType.None], { condition: ConditionGuard.Or })
  @Post('rooms/:roomId/views')
  recordView(
    @ActiveUser() user: AccessTokenPayload | undefined,
    @Param('roomId', ParseIntPipe) roomId: number,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip
    const userAgent = req.headers['user-agent']
    return this.viewLogService.recordView({
      userId: user?.userId,
      roomId,
      ipAddress,
      userAgent,
    })
  }
}
