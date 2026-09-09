import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { ElasticsearchModule } from './elasticsearch/elasticsearch.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { ConfigValidationModule } from './config/config.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate: (config) => {
        // Fail fast on missing DATABASE_URL / ELASTICSEARCH_NODE
        const required = ['DATABASE_URL', 'ELASTICSEARCH_NODE'] as const;
        for (const key of required) {
          if (!config[key]) {
            throw new Error(
              `Missing required environment variable: ${key}. Copy .env.example to .env.`,
            );
          }
        }
        return config as Record<string, unknown>;
      },
    }),
    ConfigValidationModule,
    DatabaseModule,
    ElasticsearchModule,
    IngestionModule,
    UsersModule,
    HealthModule,
  ],
})
export class AppModule {}
