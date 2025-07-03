import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import mongoose from 'mongoose';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    // Create the NestJS application
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    const frontendOrigin = configService.get<string>('FRONT_END_BASE_URL');

    app.enableCors({
      origin: frontendOrigin,
      credentials: true,
    });

    // Start the server
    const port = process.env.PORT ?? 3000;
    await app.listen(port, () => {
      logger.verbose(`Server is running on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
