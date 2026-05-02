import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';

@Module({
  imports: [HttpModule],
  controllers: [ImagesController],
  providers: [ImagesService],
  exports: [ImagesService],
})
export class ImagesModule {}
