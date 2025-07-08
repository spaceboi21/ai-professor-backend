import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    // Create the NestJS application
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    const configService = app.get(ConfigService);

    const frontendOrigin = configService.get<string>('FRONT_END_BASE_URL');

    // CORS configuration
    app.enableCors({
      origin: frontendOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.setViewEngine('hbs');

    // Set global prefix for all routes
    app.setGlobalPrefix('api');

    // Serve static assets from the uploads directory
    if (process.env.NODE_ENV !== 'production') {
      app.useStaticAssets(join(__dirname, '..', 'uploads'), {
        prefix: '/uploads/',
      });
    }

    // Swagger setup
    const swaggerConfig = new DocumentBuilder()
      .setTitle('AI Professor API')
      .setDescription('API documentation for AI Professor backend')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);

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
