import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { Redis } from 'ioredis';
import { DictionaryModule } from './dictionary/dictionary.module';
import { AiModule } from './ai/ai.module';
import { TtsModule } from './tts/tts.module';
import { ExportModule } from './export/export.module';
import { ImagesModule } from './images/images.module';
import { ExportJobsModule } from './export-jobs/export-jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: new Redis(process.env.REDIS_URL!, {
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        }),
      }),
    }),
    DictionaryModule,
    AiModule,
    TtsModule,
    ExportModule,
    ImagesModule,
    ExportJobsModule,
  ],
})
export class AppModule {}
