import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { CloudinaryService, CloudinaryUploadResult } from '@src/shared/modules/services/cloudinary.service'
import { TenantAccessService } from '@src/shared/modules/services/tenant-access.service'
import type { TUpdateRoomImageBodySchema } from './model/rooms.model'
import { RoomsRepository } from './repositories/rooms.repo'

/**
 * Service responsible for room image upload, thumbnail consistency, and Cloudinary cleanup.
 */
@Injectable()
export class RoomImagesService {
  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly tenantAccessService: TenantAccessService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async uploadRoomImages(userId: number, roomId: number, files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất một ảnh phòng')
    }

    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const room = await this.roomsRepository.findTenantRoom(tenant.tenantId, roomId)
    if (!room) {
      throw new NotFoundException('Không tìm thấy phòng')
    }

    const existingImageCount = await this.roomsRepository.countImages(roomId)
    const uploadedImages: CloudinaryUploadResult[] = []

    try {
      for (const file of files) {
        uploadedImages.push(await this.cloudinaryService.uploadImage(file, `rooms/${tenant.tenantId}/${roomId}`))
      }

      return await this.roomsRepository.createImages(
        roomId,
        uploadedImages.map((image, index) => ({
          url: image.url,
          publicId: image.publicId,
          sortOrder: existingImageCount + index,
          isThumbnail: existingImageCount === 0 && index === 0,
        })),
      )
    } catch (error) {
      await Promise.all(uploadedImages.map((image) => this.cloudinaryService.deleteImage(image.publicId).catch(() => undefined)))
      throw error
    }
  }

  async updateImage(userId: number, roomId: number, imageId: number, body: TUpdateRoomImageBodySchema) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const image = await this.roomsRepository.findTenantImage(tenant.tenantId, roomId, imageId)
    if (!image) {
      throw new NotFoundException('Không tìm thấy ảnh phòng')
    }

    return this.roomsRepository.updateImage(roomId, imageId, {
      caption: body.caption === undefined ? undefined : (body.caption ?? null),
      sortOrder: body.sortOrder,
      isThumbnail: body.isThumbnail,
    })
  }

  async deleteImage(userId: number, roomId: number, imageId: number) {
    const tenant = await this.tenantAccessService.getActiveTenantContext(userId)
    const image = await this.roomsRepository.findTenantImage(tenant.tenantId, roomId, imageId)
    if (!image) {
      throw new NotFoundException('Không tìm thấy ảnh phòng')
    }

    const deletedImage = await this.roomsRepository.deleteImage(imageId)
    await this.cloudinaryService.deleteImage(deletedImage.publicId).catch(() => undefined)
    return deletedImage
  }
}
