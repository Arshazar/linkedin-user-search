import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { IngestionService } from './ingestion.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('SeedCLI');
  logger.log('Bootstrapping application context for database and search seeding...');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const ingestionService = app.get(IngestionService);
    const result = await ingestionService.runIngestion();
    logger.log(`Seeding summary: ${JSON.stringify(result, null, 2)}`);
    logger.log('Seeding completed successfully.');
  } catch (err: any) {
    logger.error(`Seeding failed with error: ${err.message}`, err.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
