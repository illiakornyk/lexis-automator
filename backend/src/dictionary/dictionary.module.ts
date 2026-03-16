import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DictionaryService } from './dictionary.service';
import { DictionaryController } from './dictionary.controller';

@Module({
  imports: [HttpModule],
  providers: [DictionaryService],
  controllers: [DictionaryController],
})
export class DictionaryModule {}
