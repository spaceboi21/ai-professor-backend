import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { ActivityLogInterceptor } from './common/interceptors/activity-log.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    // Create the NestJS application
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    const configService = app.get(ConfigService);

    // Validate LibreOffice availability for PPT to PDF conversion
    logger.log('🔍 Validating LibreOffice installation...');
    try {
      const { LibreOfficeDetectorService } = await import('./modules/conversion/services/libreoffice-detector.service');
      const libreOfficeDetector = new LibreOfficeDetectorService(configService);
      await libreOfficeDetector.validateLibreOfficeOrThrow();
    } catch (error) {
      logger.error('❌ LibreOffice validation failed:', error.message);
      logger.error('💡 Please install LibreOffice to enable PPT to PDF conversion functionality.');
      logger.error('📥 Download from: https://www.libreoffice.org/download/');
      throw error;
    }

    // Apply global interceptor for activity logging
    const activityLogInterceptor = app.get(ActivityLogInterceptor);
    app.useGlobalInterceptors(activityLogInterceptor);

    // Get portal URLs from environment variables
    const adminPortalUrl = configService.get<string>('ADMIN_PORTAL_URL');
    const schoolPortalUrl = configService.get<string>('SCHOOL_PORTAL_URL');
    const studentPortalUrl = configService.get<string>('STUDENT_PORTAL_URL');
    
    // Collect allowed origins (filter out undefined values)
    const allowedOrigins = [adminPortalUrl, schoolPortalUrl, studentPortalUrl].filter(Boolean);

    // CORS configuration with environment-based access control
    app.enableCors({
      origin: (origin, callback) => {
        // For development, allow all origins
        if (process.env.NODE_ENV === 'development') {
          return callback(null, true);
        }

        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Check if the origin is in the allowed portal URLs
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Reject the request for production
        return callback(new Error('Not allowed by CORS'), false);
      },
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
      const corsMessage = process.env.NODE_ENV === 'development' 
        ? '🌐 CORS enabled for: All origins (Development mode)'
        : `🌐 CORS enabled for: ${allowedOrigins.length > 0 ? allowedOrigins.join(', ') : 'No origins configured'}`;
      logger.log(corsMessage);
    });
  } catch (error) {
    logger.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
