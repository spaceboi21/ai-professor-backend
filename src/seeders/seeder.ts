import { NestFactory } from '@nestjs/core';
import { SeedModule } from './seed.module';
import { RoleSeederService } from './role-seeder.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SeedModule);

  try {
    const seeder = app.get(RoleSeederService);
    await seeder.seed();
    console.log('🎉 Seeder complete');
  } catch (error) {
    console.error('❌ Seeding error:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
