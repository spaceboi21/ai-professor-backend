import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BibliographyService } from './bibliography.service';
import { BibliographyController } from './bibliography.controller';
import { User, UserSchema } from 'src/database/schemas/central/user.schema';
import {
  School,
  SchoolSchema,
} from 'src/database/schemas/central/school.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { ChaptersModule } from '../chapters/chapters.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: School.name, schema: SchoolSchema },
    ]),
    ChaptersModule,
  ],
  controllers: [BibliographyController],
  providers: [BibliographyService, TenantConnectionService],
  exports: [BibliographyService],
})
export class BibliographyModule {}
