import { Module } from '@nestjs/common';
import { TtsService } from './tts.service';
import { TtsController } from './tts.controller';
import { SupabaseModule } from '@/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [TtsController],
  providers: [TtsService],
  exports: [TtsService],
})
export class TtsModule {}
