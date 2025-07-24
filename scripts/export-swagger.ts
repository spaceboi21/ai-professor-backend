import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../src/app.module';

async function exportSwagger() {
  try {
    console.log('🚀 Starting application to generate Swagger documentation...');

    // Create the NestJS application
    const app = await NestFactory.create(AppModule);

    // Set global prefix to match your API
    app.setGlobalPrefix('api');

    // Configure Swagger
    const swaggerConfig = new DocumentBuilder()
      .setTitle('AI Professor API')
      .setDescription('API documentation for AI Professor backend')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    // Generate the Swagger document
    const document = SwaggerModule.createDocument(app, swaggerConfig);

    // Export as JSON
    const jsonPath = join(__dirname, '..', 'swagger-docs.json');
    writeFileSync(jsonPath, JSON.stringify(document, null, 2));

    console.log(`✅ Swagger documentation exported to: ${jsonPath}`);
    console.log('📋 You can now import this file into Postman:');
    console.log('   1. Open Postman');
    console.log('   2. Click "Import"');
    console.log('   3. Select the swagger-docs.json file');
    console.log(
      '   4. All your APIs will be imported with proper documentation',
    );
    console.log('');
    console.log('🔗 Alternative: You can also access the live Swagger UI at:');
    console.log('   http://localhost:5000/api/docs');

    // Close the application
    await app.close();
  } catch (error) {
    console.error('❌ Error exporting Swagger documentation:', error);
    process.exit(1);
  }
}

exportSwagger();
