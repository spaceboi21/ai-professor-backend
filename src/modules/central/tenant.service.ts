import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { School } from 'src/database/schemas/central/school.schema';

@Injectable()
export class TenantService {
  constructor(
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
  ) {}
  async getTenantDbName(school_id: string): Promise<string> {
    // Get school details to find tenant DB name
    const school = await this.schoolModel.findById(school_id);
    if (!school) {
      throw new UnauthorizedException('School not found');
    }

    const dbName = school.db_name;
    if (!dbName) throw new Error(`No DB found for school: ${school.name}`);
    return dbName;
  }
}
