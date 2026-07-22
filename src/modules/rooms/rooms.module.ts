import { Module } from '@nestjs/common'
import { RoomImagesService } from './room-images.service'
import { RoomsController } from './rooms.controller'
import { RoomsService } from './rooms.service'
import { RoomsRepository } from './repositories/rooms.repo'

@Module({
  controllers: [RoomsController],
  providers: [RoomsService, RoomImagesService, RoomsRepository],
  exports: [RoomsService, RoomImagesService, RoomsRepository],
})
export class RoomsModule {}
