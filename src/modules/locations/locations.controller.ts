import { Controller, Get, Query } from '@nestjs/common'
import { isPublic } from '@src/common/decorators/decorators/auth.decorator'
import {
  AutocompleteQueryDTO,
  ListWardsQueryDTO,
  PlaceDetailQueryDTO,
  ReverseGeocodeQueryDTO,
} from './dto/locations.dto'
import { LocationsService } from './locations.service'

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('provinces')
  @isPublic()
  listProvinces() {
    return this.locationsService.listProvinces()
  }

  @Get('wards')
  @isPublic()
  listWards(@Query() query: ListWardsQueryDTO) {
    return this.locationsService.listWards(query.provinceCode)
  }

  @Get('autocomplete')
  @isPublic()
  autocomplete(@Query() query: AutocompleteQueryDTO) {
    return this.locationsService.autocomplete(query)
  }

  @Get('place-detail')
  @isPublic()
  placeDetail(@Query() query: PlaceDetailQueryDTO) {
    return this.locationsService.placeDetail(query)
  }

  @Get('reverse-geocode')
  @isPublic()
  reverseGeocode(@Query() query: ReverseGeocodeQueryDTO) {
    return this.locationsService.reverseGeocode(query)
  }
}
