import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { isPublic } from '@src/common/decorators/decorators/auth.decorator'
import { IsTenant } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import {
  CreateMarketplaceRentalRequestBodyDTO,
  CreateMarketplaceViewingAppointmentBodyDTO,
  ListMarketplaceAmenitiesQueryDTO,
  ListMarketplaceRoomsQueryDTO,
} from './dto/marketplace.dto'
import { MarketplaceService } from './marketplace.service'

/**
 * Public marketplace room discovery and authenticated renter actions.
 */
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @isPublic()
  @Get('amenities')
  listAmenities(@Query() query: ListMarketplaceAmenitiesQueryDTO) {
    return this.marketplaceService.listAmenities(query)
  }

  @isPublic()
  @Get('rooms')
  listRooms(@Query() query: ListMarketplaceRoomsQueryDTO) {
    return this.marketplaceService.listRooms(query)
  }

  @isPublic()
  @Get('rooms/:id')
  getRoomById(@Param('id', ParseIntPipe) id: number) {
    return this.marketplaceService.getRoomById(id)
  }

  @isPublic()
  @Get('rooms/:id/similar')
  getSimilarRooms(@Param('id', ParseIntPipe) id: number) {
    return this.marketplaceService.getSimilarRooms(id)
  }

  @IsTenant()
  @Post('rooms/:id/rental-requests')
  createRentalRequest(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateMarketplaceRentalRequestBodyDTO,
  ) {
    return this.marketplaceService.createRentalRequest(user.userId, id, body)
  }

  @IsTenant()
  @Post('rooms/:id/viewing-appointments')
  createViewingAppointment(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateMarketplaceViewingAppointmentBodyDTO,
  ) {
    return this.marketplaceService.createViewingAppointment(user.userId, id, body)
  }
}
