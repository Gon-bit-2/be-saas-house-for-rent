import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { IsAdmin } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import {
  ListAdminMarketplaceRoomsQueryDTO,
  MarketplaceModerationHistoryQueryDTO,
  UpdateAdminMarketplaceStatusBodyDTO,
} from './dto/marketplace-admin.dto'
import { MarketplaceAdminService } from './marketplace-admin.service'

@IsAdmin()
@Controller('marketplace/admin')
export class MarketplaceAdminController {
  constructor(private readonly marketplaceAdminService: MarketplaceAdminService) {}

  @Get('rooms')
  list(@Query() query: ListAdminMarketplaceRoomsQueryDTO) {
    return this.marketplaceAdminService.list(query)
  }

  @Get('rooms/:id/history')
  getHistory(@Param('id', ParseIntPipe) id: number, @Query() query: MarketplaceModerationHistoryQueryDTO) {
    return this.marketplaceAdminService.getHistory(id, query)
  }

  @Get('rooms/:id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.marketplaceAdminService.getById(id)
  }

  @Patch('rooms/:id/status')
  updateStatus(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAdminMarketplaceStatusBodyDTO,
  ) {
    return this.marketplaceAdminService.updateStatus(user.userId, id, body)
  }
}
