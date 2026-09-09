import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AppConfig {
  port: number;
  databaseUrl: string;
  elasticsearchNode: string;
  csvFilePath: string;
  clientOrigin: string;
}

/**
 * Validates that all consumed environment variables are present and
 * well-formed; fails fast at bootstrap instead of at first request.
 */
export function validateConfig(config: Record<string, unknown>): AppConfig {
  const required = ['DATABASE_URL', 'ELASTICSEARCH_NODE'] as const;

  for (const key of required) {
    if (!config[key]) {
      throw new Error(
        `Missing required environment variable: ${key}. Copy .env.example to .env and fill in values.`,
      );
    }
  }

  const port = Number(config.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be an integer between 1 and 65535, got: ${config.PORT}`);
  }

  return {
    port,
    databaseUrl: String(config.DATABASE_URL),
    elasticsearchNode: String(config.ELASTICSEARCH_NODE),
    csvFilePath: String(config.CSV_FILE_PATH ?? './db/300 user linkedin.csv'),
    clientOrigin: String(config.CLIENT_ORIGIN ?? 'http://localhost:5173'),
  };
}

/**
 * Exposes validated config values as a typed injection token so feature
 * modules read one source of truth instead of raw ConfigService lookups.
 */
export const APP_CONFIG = 'APP_CONFIG';

@Module({
  providers: [
    {
      provide: APP_CONFIG,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const raw: Record<string, unknown> = {
          PORT: configService.get('PORT'),
          DATABASE_URL: configService.get('DATABASE_URL'),
          ELASTICSEARCH_NODE: configService.get('ELASTICSEARCH_NODE'),
          CSV_FILE_PATH: configService.get('CSV_FILE_PATH'),
          CLIENT_ORIGIN: configService.get('CLIENT_ORIGIN'),
        };
        return validateConfig(raw);
      },
    },
  ],
  exports: [APP_CONFIG],
})
export class ConfigValidationModule {}
