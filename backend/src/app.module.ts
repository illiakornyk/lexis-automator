import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DictionaryModule } from './dictionary/dictionary.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DictionaryModule,
    AiModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
