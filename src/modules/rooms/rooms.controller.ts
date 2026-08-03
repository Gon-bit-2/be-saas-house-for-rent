import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import roleName from '@src/common/constants/role.constant'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { Roles } from '@src/common/decorators/decorators/roles.decorator'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import { memoryStorage } from 'multer'
import {
  CreateRoomBodyDTO,
  ListRoomsQueryDTO,
  ReplaceRoomAmenitiesBodyDTO,
  UpdateRoomBodyDTO,
  UpdateRoomImageBodyDTO,
  UpdateRoomMarketplaceBodyDTO,
  UpdateRoomStatusBodyDTO,
} from './dto/rooms.dto'
import { RoomImagesService } from './room-images.service'
import { RoomsService } from './rooms.service'

const imageFileInterceptor = FilesInterceptor('files', 10, {
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
 * Tenant-scoped controller for room, room image, and room amenity management.
 */
@Roles(roleName.LANDLORD, roleName.MANAGER)
@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly roomImagesService: RoomImagesService,
  ) {}

  @Get()
  list(@ActiveUser() user: AccessTokenPayload, @Query() query: ListRoomsQueryDTO) {
    return this.roomsService.list(user.userId, query)
  }

  @Get(':id')
  getById(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.roomsService.getById(user.userId, id)
  }

  @Post()
  create(@ActiveUser() user: AccessTokenPayload, @Body() body: CreateRoomBodyDTO) {
    return this.roomsService.create(user.userId, body)
  }

  @Patch(':id')
  update(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateRoomBodyDTO,
  ) {
    return this.roomsService.update(user.userId, id, body)
  }

  @Patch(':id/status')
  updateStatus(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateRoomStatusBodyDTO,
  ) {
    return this.roomsService.updateStatus(user.userId, id, body)
  }

  @Patch(':id/marketplace')
  updateMarketplace(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateRoomMarketplaceBodyDTO,
  ) {
    return this.roomsService.updateMarketplace(user.userId, id, body)
  }

  @Patch(':id/amenities')
  replaceAmenities(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ReplaceRoomAmenitiesBodyDTO,
  ) {
    return this.roomsService.replaceAmenities(user.userId, id, body)
  }

  @Post(':id/images')
  @UseInterceptors(imageFileInterceptor)
  uploadImages(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.roomImagesService.uploadRoomImages(user.userId, id, files)
  }

  @Patch(':id/images/:imageId')
  updateImage(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @Body() body: UpdateRoomImageBodyDTO,
  ) {
    return this.roomImagesService.updateImage(user.userId, id, imageId, body)
  }

  @Delete(':id/images/:imageId')
  deleteImage(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ) {
    return this.roomImagesService.deleteImage(user.userId, id, imageId)
  }

  @Delete(':id')
  softDelete(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.roomsService.softDelete(user.userId, id)
  }
}
