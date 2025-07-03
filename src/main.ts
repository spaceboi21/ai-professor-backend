import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    // Create the NestJS application
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    const frontendOrigin = configService.get<string>('FRONT_END_BASE_URL');

    // CORS configuration
    app.enableCors({
      origin: frontendOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    app.useGlobalPipes();

    // Set global prefix for all routes
    app.setGlobalPrefix('api');

    // Start the server
    const port = process.env.PORT ?? 3000;
    await app.listen(port, () => {
      logger.log(`🚀 Server is running on port ${port}`);
      logger.log(`📱 API available at: http://localhost:${port}/api`);
      logger.log(`🌐 CORS enabled for: ${frontendOrigin}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
