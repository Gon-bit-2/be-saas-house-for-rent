import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import roleName from '@src/common/constants/role.constant'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { IsAdmin, Roles } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import { CreateAmenityBodyDTO, ListAmenitiesQueryDTO, UpdateAmenityBodyDTO } from './dto/amenities.dto'
import { AmenitiesService } from './amenities.service'

/**
 * Controller for the global amenity catalog used when assigning amenities to rooms.
 */
@Roles(roleName.LANDLORD, roleName.MANAGER)
@Controller('amenities')
export class AmenitiesController {
  constructor(private readonly amenitiesService: AmenitiesService) {}

  @Get()
  list(@ActiveUser() user: AccessTokenPayload, @Query() query: ListAmenitiesQueryDTO) {
    return this.amenitiesService.list(query, user.roleName)
  }

  @IsAdmin()
  @Post()
  create(@ActiveUser() user: AccessTokenPayload, @Body() body: CreateAmenityBodyDTO) {
    return this.amenitiesService.create(body, user.userId)
  }

  @IsAdmin()
  @Patch(':id')
  update(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateAmenityBodyDTO) {
    return this.amenitiesService.update(id, body, user.userId)
  }
}
