import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import roleName from '@src/common/constants/role.constant'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { Roles } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import { CreateRoomAssetBodyDTO, ListRoomAssetsQueryDTO, UpdateRoomAssetBodyDTO } from './dto/assets.dto'
import { RoomAssetsService } from './room-assets.service'

@Roles(roleName.LANDLORD, roleName.MANAGER)
@Controller()
export class RoomAssetsController {
  constructor(private readonly service: RoomAssetsService) {}

  @Get('rooms/:roomId/assets')
  list(
    @ActiveUser() user: AccessTokenPayload,
    @Param('roomId', ParseIntPipe) roomId: number,
    @Query() query: ListRoomAssetsQueryDTO,
  ) {
    return this.service.list(user.userId, roomId, query)
  }

  @Get('room-assets/:id')
  getById(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.getById(user.userId, id)
  }

  @Post('rooms/:roomId/assets')
  create(
    @ActiveUser() user: AccessTokenPayload,
    @Param('roomId', ParseIntPipe) roomId: number,
    @Body() body: CreateRoomAssetBodyDTO,
  ) {
    return this.service.create(user.userId, roomId, body)
  }

  @Patch('room-assets/:id')
  update(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateRoomAssetBodyDTO,
  ) {
    return this.service.update(user.userId, id, body)
  }

  @Delete('room-assets/:id')
  delete(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.delete(user.userId, id)
  }
}
