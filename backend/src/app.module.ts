import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DictionaryModule } from './dictionary/dictionary.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DictionaryModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
