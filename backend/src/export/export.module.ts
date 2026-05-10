import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { TtsModule } from '@/tts/tts.module';
import { ImagesModule } from '@/images/images.module';

@Module({
  imports: [HttpModule.register({ timeout: 10 * 60 * 1000 }), TtsModule, ImagesModule],
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
