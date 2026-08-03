import { Injectable } from '@nestjs/common'
import envConfig from '@src/config/env.config'
import type { UploadApiResponse } from 'cloudinary'
import { v2 as cloudinary } from 'cloudinary'

export type CloudinaryUploadResult = {
  url: string
  publicId: string
}

/**
 * Thin wrapper around Cloudinary upload and deletion operations used by file-backed modules.
 */
@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: envConfig.CLOUDINARY_CLOUD_NAME,
      api_key: envConfig.CLOUDINARY_API_KEY,
      api_secret: envConfig.CLOUDINARY_API_SECRET,
    })
  }

  /**
   * Uploads an in-memory Multer file buffer to Cloudinary and returns the persisted identifiers.
   */
  async uploadImage(file: Express.Multer.File, folder: string): Promise<CloudinaryUploadResult> {
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error, uploadResult) => {
          if (error || !uploadResult) {
            reject(new Error(error?.message ?? 'Cloudinary upload failed'))
            return
          }
          resolve(uploadResult)
        },
      )

      stream.end(file.buffer)
    })

    return {
      url: result.secure_url,
      publicId: result.public_id,
    }
  }

  /**
   * Deletes a Cloudinary asset when a DB image record is removed. Failures are intentionally non-blocking.
   */
  async deleteImage(publicId?: string | null) {
    if (!publicId) {
      return
    }

    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' })
  }
}
