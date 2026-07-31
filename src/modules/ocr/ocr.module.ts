import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { UtilityMetersModule } from '@src/modules/utility-meters/utility-meters.module'
import { OCR_QUEUE } from './ocr.constants'
import { OcrController } from './ocr.controller'
import { OcrProcessor } from './ocr.processor'
import { OcrService } from './ocr.service'
import { OCR_PROVIDER } from './providers/ocr.provider'
import { TesseractOcrProvider } from './providers/tesseract-ocr.provider'
import { OcrRepository } from './repositories/ocr.repo'

@Module({
  imports: [UtilityMetersModule, BullModule.registerQueue({ name: OCR_QUEUE, forceDisconnectOnShutdown: true })],
  controllers: [OcrController],
  providers: [
    OcrService,
    OcrProcessor,
    OcrRepository,
    TesseractOcrProvider,
    { provide: OCR_PROVIDER, useExisting: TesseractOcrProvider },
  ],
})
export class OcrModule {}
