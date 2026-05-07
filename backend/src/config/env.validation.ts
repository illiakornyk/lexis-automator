import { plainToInstance } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUrl, validateSync } from 'class-validator';

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(NodeEnv)
  @IsOptional()
  NODE_ENV: NodeEnv = NodeEnv.Development;

  // Supabase
  @IsUrl({ require_tld: false })
  SUPABASE_URL: string;

  @IsString()
  SUPABASE_SERVICE_ROLE_KEY: string;

  @IsString()
  SUPABASE_JWT_SECRET: string;

  // Redis
  @IsString()
  REDIS_URL: string;

  // Google TTS — path to service account JSON
  @IsString()
  GOOGLE_APPLICATION_CREDENTIALS: string;

  // Pixabay
  @IsString()
  PIXABAY_API_KEY: string;

  // OpenRouter / AI
  @IsString()
  OPENROUTER_API_KEY: string;

  @IsString()
  @IsOptional()
  OPENROUTER_MODEL: string;

  // Python anki-exporter sidecar (optional — defaults to localhost:8000)
  @IsUrl({ require_tld: false })
  @IsOptional()
  ANKI_EXPORTER_URL: string;

  @IsString()
  @IsOptional()
  PORT: string;
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
