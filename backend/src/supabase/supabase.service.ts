import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

@Injectable()
export class SupabaseService {
  readonly client: SupabaseClient<Database>;

  constructor(config: ConfigService) {
    this.client = createClient<Database>(
      config.getOrThrow('SUPABASE_URL'),
      config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }
}
