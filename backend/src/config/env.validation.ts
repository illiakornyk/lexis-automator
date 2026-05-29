import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  validateSync,
} from 'class-validator';

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(NodeEnv)
  @IsOptional()
  NODE_ENV: NodeEnv = NodeEnv.Development;

  // Dictionary API
  @IsUrl({ require_tld: false })
  FREE_DICTIONARY_API_URL: string;

  // Supabase
  @IsUrl({ require_tld: false })
  SUPABASE_URL: string;

  @IsString()
  SUPABASE_SERVICE_ROLE_KEY: string;

  // Redis
  @IsString()
  REDIS_URL: string;

  // Google Cloud Text-to-Speech API key (REST authentication)
  @IsString()
  GOOGLE_TTS_API_KEY: string;

  // Pixabay
  @IsString()
  PIXABAY_API_KEY: string;

  // LLM provider
  @IsEnum(['openrouter', 'openai', 'gemini', 'anthropic'])
  LLM_PROVIDER: string;

  @IsString()
  LLM_API_KEY: string;

  @IsString()
  @IsOptional()
  LLM_MODEL: string;

  // Python anki-exporter sidecar (optional — defaults to localhost:8000)
  @IsUrl({ require_tld: false })
  @IsOptional()
  ANKI_EXPORTER_URL: string;

  @IsString()
  @IsOptional()
  PORT: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  APP_URL: string;

  // Comma-separated list of allowed CORS origins. Defaults to http://localhost:3001 if unset.
  @IsString()
  @IsOptional()
  CORS_ORIGINS: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const missing = errors
      .map((e) => {
        const constraints = Object.values(e.constraints ?? {}).join(', ');
        return `  ${e.property}: ${constraints}`;
      })
      .join('\n');

    throw new Error(`Missing or invalid environment variables:\n${missing}`);
  }

  return validated;
}
