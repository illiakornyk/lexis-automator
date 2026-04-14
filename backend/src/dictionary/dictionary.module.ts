import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DictionaryService } from './dictionary.service';
import { DictionaryController } from './dictionary.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [HttpModule, AiModule],
  providers: [DictionaryService],
  controllers: [DictionaryController],
})
export class DictionaryModule {}
