import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DictionaryModule } from './dictionary/dictionary.module';
import { AiModule } from './ai/ai.module';
import { TtsModule } from './tts/tts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DictionaryModule,
    AiModule,
    TtsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
