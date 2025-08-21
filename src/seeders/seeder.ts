import { NestFactory } from '@nestjs/core';
import { SeedModule } from './seed.module';
import { RoleSeederService } from './role-seeder.service';
import { SuperAdminSeederService } from './super-admin-seeder.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SeedModule);

  try {
    const seeder = app.get(RoleSeederService);
    await seeder.seed();

    const superAdminSeeder = app.get(SuperAdminSeederService);
    await superAdminSeeder.seed();

    console.info('🎉 Seeder complete');
  } catch (error) {
    console.error('❌ Seeding error:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
