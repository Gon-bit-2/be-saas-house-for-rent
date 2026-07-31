import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import roleName from '@src/common/constants/role.constant'
import { ActiveUser } from '@src/common/decorators/decorators/active-user.decorator'
import { Roles } from '@src/common/decorators/decorators/roles.decorator'
import { ResourceRateLimit } from '@src/common/rate-limit/resource-rate-limit.decorator'
import { ResourceRateLimitGuard } from '@src/common/rate-limit/resource-rate-limit.guard'
import type { AccessTokenPayload } from '@src/common/types/jwt.type'
import envConfig from '@src/config/env.config'
import { memoryStorage } from 'multer'
import { AcceptOcrJobBodyDTO, CreateOcrJobBodyDTO, ListOcrJobsQueryDTO } from './dto/ocr.dto'
import { OcrService } from './ocr.service'

const ocrFileInterceptor = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: envConfig.OCR_UPLOAD_MAX_BYTES, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (/^image\/(jpeg|jpg|png|webp)$/.test(file.mimetype)) {
      callback(null, true)
      return
    }
    callback(new BadRequestException('Chỉ hỗ trợ ảnh jpg, jpeg, png hoặc webp'), false)
  },
})

@Roles(roleName.LANDLORD)
@UseGuards(ResourceRateLimitGuard)
@Controller('ocr')
export class OcrController {
  constructor(private readonly service: OcrService) {}

  @Get('jobs')
  list(@ActiveUser() user: AccessTokenPayload, @Query() query: ListOcrJobsQueryDTO) {
    return this.service.list(user.userId, query)
  }

  @Get('jobs/:id')
  getById(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.getById(user.userId, id)
  }

  @Post('jobs')
  @HttpCode(202)
  @ResourceRateLimit('ocr-create')
  @UseInterceptors(ocrFileInterceptor)
  create(
    @ActiveUser() user: AccessTokenPayload,
    @Body() body: CreateOcrJobBodyDTO,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.create(user.userId, body, file)
  }

  @Post('jobs/:id/retry')
  @HttpCode(202)
  @ResourceRateLimit('ocr-create')
  retry(@ActiveUser() user: AccessTokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.retry(user.userId, id)
  }

  @Post('jobs/:id/accept')
  accept(
    @ActiveUser() user: AccessTokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AcceptOcrJobBodyDTO,
  ) {
    return this.service.accept(user.userId, id, body)
  }
}
