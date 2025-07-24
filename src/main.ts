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

    // Parse multiple frontend origins from environment variable
    const frontendOriginString =
      configService.get<string>('ALLOWED_CORS_URLS') || 'http://localhost:3000';
    const frontendOrigins = frontendOriginString
      .split(',')
      .map((origin) => origin.trim());

    // CORS configuration with multiple domains support
    app.enableCors({
      // origin: (origin, callback) => {
      //   // Allow requests with no origin (like mobile apps or curl requests)
      //   if (!origin) return callback(null, true);

      //   // Check if the origin is in the allowed list
      //   if (frontendOrigins.includes(origin)) {
      //     return callback(null, true);
      //   }

      //   // For development, allow localhost with any port
      //   if (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost')) {
      //     return callback(null, true);
      //   }

      //   // Reject the request
      //   return callback(new Error('Not allowed by CORS'), false);
      // },
      origin: '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['X-Total-Count', 'X-Total-Pages'],
    });

    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.setViewEngine('hbs');

    // Set global prefix for all routes
    app.setGlobalPrefix('api');

    // Serve static assets from the uploads directory
    if (process.env.NODE_ENV !== 'production') {
      app.useStaticAssets(join(__dirname, '..', '..', 'uploads'), {
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

    // Start the server - Test case expects port 5000
    const port = process.env.PORT ?? 5000;
    await app.listen(port, () => {
      logger.log(`🚀 Server is running on port ${port}`);
      logger.log(`📱 API available at: http://localhost:${port}/api`);
      logger.log(`🏥 Health check at: http://localhost:${port}/api/health`);
      logger.log(`📚 API docs at: http://localhost:${port}/api/docs`);
      logger.log(`🌐 CORS enabled for: ${frontendOrigins.join(', ')}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
