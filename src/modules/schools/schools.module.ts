import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  School,
  SchoolSchema,
} from 'src/database/schemas/central/school.schema';
import { SchoolsController } from './schools.controller';
import { SchoolsService } from './schools.service';
import { User, UserSchema } from 'src/database/schemas/central/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: School.name, schema: SchoolSchema }]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [SchoolsController],
  providers: [SchoolsService],
  exports: [SchoolsService],
})
export class SchoolsModule {}
