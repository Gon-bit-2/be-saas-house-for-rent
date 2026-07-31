import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import roleName from '@src/common/constants/role.constant'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { Roles } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import { AssetCategoriesService } from './asset-categories.service'
import { CreateAssetCategoryBodyDTO, ListAssetCategoriesQueryDTO, UpdateAssetCategoryBodyDTO } from './dto/assets.dto'

@Roles(roleName.LANDLORD, roleName.MANAGER)
@Controller('asset-categories')
export class AssetCategoriesController {
  constructor(private readonly service: AssetCategoriesService) {}

  @Get()
  list(@ActiveUser() user: AccessTokenPayload, @Query() query: ListAssetCategoriesQueryDTO) {
    return this.service.list(user.userId, query)
  }

  @Get(':id')
  getById(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.getById(user.userId, id)
  }

  @Post()
  create(@ActiveUser() user: AccessTokenPayload, @Body() body: CreateAssetCategoryBodyDTO) {
    return this.service.create(user.userId, body)
  }

  @Patch(':id')
  update(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAssetCategoryBodyDTO,
  ) {
    return this.service.update(user.userId, id, body)
  }

  @Delete(':id')
  delete(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.delete(user.userId, id)
  }
}
