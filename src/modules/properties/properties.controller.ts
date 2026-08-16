import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import roleName from '@src/common/constants/role.constant'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { Roles } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import { memoryStorage } from 'multer'
import {
  CreateFloorBodyDTO,
  CreatePropertyBodyDTO,
  ListPropertiesQueryDTO,
  UpdateFloorBodyDTO,
  UpdatePropertyBodyDTO,
  UpdatePropertyStatusBodyDTO,
} from './dto/properties.dto'
import { PropertiesService } from './properties.service'

const imageFileInterceptor = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    if (/^image\/(jpeg|jpg|png|webp)$/.test(file.mimetype)) {
      callback(null, true)
      return
    }

    callback(new BadRequestException('Chỉ hỗ trợ ảnh jpg, jpeg, png hoặc webp'), false)
  },
})

/**
 * Tenant-scoped controller for managing properties and their floors.
 */
@Roles(roleName.LANDLORD, roleName.MANAGER)
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  list(@ActiveUser() user: AccessTokenPayload, @Query() query: ListPropertiesQueryDTO) {
    return this.propertiesService.list(user.userId, query)
  }

  @Get(':id')
  getById(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.propertiesService.getById(user.userId, id)
  }

  @Post()
  create(@ActiveUser() user: AccessTokenPayload, @Body() body: CreatePropertyBodyDTO) {
    return this.propertiesService.create(user.userId, body)
  }

  @Patch(':id')
  update(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePropertyBodyDTO,
  ) {
    return this.propertiesService.update(user.userId, id, body)
  }

  @Patch(':id/status')
  updateStatus(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePropertyStatusBodyDTO,
  ) {
    return this.propertiesService.updateStatus(user.userId, id, body)
  }

  @Delete(':id')
  softDelete(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.propertiesService.softDelete(user.userId, id)
  }

  @Get(':propertyId/floors')
  listFloors(@ActiveUser() user: AccessTokenPayload, @Param('propertyId', ParseIntPipe) propertyId: number) {
    return this.propertiesService.listFloors(user.userId, propertyId)
  }

  @Post(':propertyId/floors')
  createFloor(
    @ActiveUser() user: AccessTokenPayload,
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() body: CreateFloorBodyDTO,
  ) {
    return this.propertiesService.createFloor(user.userId, propertyId, body)
  }

  @Patch(':propertyId/floors/:floorId')
  updateFloor(
    @ActiveUser() user: AccessTokenPayload,
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Param('floorId', ParseIntPipe) floorId: number,
    @Body() body: UpdateFloorBodyDTO,
  ) {
    return this.propertiesService.updateFloor(user.userId, propertyId, floorId, body)
  }

  @Delete(':propertyId/floors/:floorId')
  deleteFloor(
    @ActiveUser() user: AccessTokenPayload,
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Param('floorId', ParseIntPipe) floorId: number,
  ) {
    return this.propertiesService.deleteFloor(user.userId, propertyId, floorId)
  }

  @Post(':id/cover-image')
  @UseInterceptors(imageFileInterceptor)
  uploadCoverImage(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.propertiesService.uploadCoverImage(user.userId, id, file)
  }
}
