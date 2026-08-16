import { Controller, Delete, Get, Param, ParseIntPipe, Post } from '@nestjs/common'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import { FavoriteService } from './favorite.service'

/**
 * Controller for managing user favorite rooms
 */
@Controller('marketplace/favorites')
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Get()
  getFavorites(@ActiveUser() user: AccessTokenPayload) {
    return this.favoriteService.getFavorites(user.userId)
  }

  @Post(':roomId')
  addFavorite(@ActiveUser() user: AccessTokenPayload, @Param('roomId', ParseIntPipe) roomId: number) {
    return this.favoriteService.addFavorite(user.userId, roomId)
  }

  @Delete(':roomId')
  removeFavorite(@ActiveUser() user: AccessTokenPayload, @Param('roomId', ParseIntPipe) roomId: number) {
    return this.favoriteService.removeFavorite(user.userId, roomId)
  }
}
