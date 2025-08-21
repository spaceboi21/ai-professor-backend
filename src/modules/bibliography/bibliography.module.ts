import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BibliographyController } from './bibliography.controller';
import { PptBibliographyController } from './ppt-bibliography.controller';
import { BibliographyService } from './bibliography.service';
import { PptBibliographyService } from './ppt-bibliography.service';
import { PptParserService } from './ppt-parser.service';
import {
  Bibliography,
  BibliographySchema,
} from 'src/database/schemas/tenant/bibliography.schema';
import { User, UserSchema } from 'src/database/schemas/central/user.schema';
import {
  School,
  SchoolSchema,
} from 'src/database/schemas/central/school.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { ChaptersModule } from '../chapters/chapters.module';
import { AnchorTagModule } from '../anchor-tag/anchor-tag.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: School.name, schema: SchoolSchema },
    ]),
    ChaptersModule,
    AnchorTagModule,
  ],
  controllers: [BibliographyController, PptBibliographyController],
  providers: [
    BibliographyService,
    TenantConnectionService,
    PptParserService,
    PptBibliographyService,
  ],
  exports: [BibliographyService, PptParserService, PptBibliographyService],
})
export class BibliographyModule {}
