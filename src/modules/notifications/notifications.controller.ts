import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import { EmptyNotificationBodyDTO, ListNotificationsQueryDTO, RegisterDeviceTokenBodyDTO } from './dto/notifications.dto'
import { NotificationsService } from './notifications.service'

@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('notifications')
  listMine(@ActiveUser() user: AccessTokenPayload, @Query() query: ListNotificationsQueryDTO) {
    return this.notificationsService.listMine(user.userId, query)
  }

  @Get('notifications/unread-count')
  countUnread(@ActiveUser() user: AccessTokenPayload) {
    return this.notificationsService.countUnread(user.userId)
  }

  @Patch('notifications/:id/read')
  markRead(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() _body: EmptyNotificationBodyDTO,
  ) {
    return this.notificationsService.markRead(user.userId, id)
  }

  @Patch('notifications/read-all')
  markAllRead(@ActiveUser() user: AccessTokenPayload, @Body() _body: EmptyNotificationBodyDTO) {
    return this.notificationsService.markAllRead(user.userId)
  }

  @Post('notifications/test')
  sendTest(@ActiveUser() user: AccessTokenPayload, @Body() _body: EmptyNotificationBodyDTO) {
    return this.notificationsService.sendTest(user.userId)
  }

  @Post('device-tokens')
  registerDeviceToken(@ActiveUser() user: AccessTokenPayload, @Body() body: RegisterDeviceTokenBodyDTO) {
    return this.notificationsService.registerDeviceToken(user.userId, body)
  }

  @Delete('device-tokens/:id')
  disableDeviceToken(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.disableDeviceToken(user.userId, id)
  }
}
