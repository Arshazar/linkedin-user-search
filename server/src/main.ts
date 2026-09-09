import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { APP_CONFIG, AppConfig } from './config/config.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const config = app.get<AppConfig>(APP_CONFIG);

  // Enable CORS for the React Router client origin
  app.enableCors({
    origin: [config.clientOrigin, 'http://localhost:5173'],
    methods: '*',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  await app.listen(config.port);
  logger.log(`Server is running on: http://localhost:${config.port}`);
  logger.log(`Health check: http://localhost:${config.port}/api/health`);
  logger.log(`Search endpoint: http://localhost:${config.port}/api/users/search`);
}

bootstrap();
