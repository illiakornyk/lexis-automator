import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { TtsModule } from '../tts/tts.module';

@Module({
  imports: [HttpModule, TtsModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
