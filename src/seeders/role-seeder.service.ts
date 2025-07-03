import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role } from '../database/schemas/central/role.schema';
import { ROLE_IDS, RoleEnum } from 'src/common/constants/roles.constant';

@Injectable()
export class RoleSeederService {
  constructor(
    @InjectModel(Role.name)
    private readonly roleModel: Model<Role>,
  ) {}

  async seed() {
    console.log('🌱 Seeding roles...');
    const operations = Object.values(RoleEnum).map((role) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(ROLE_IDS[role]), name: role },
        update: {
          $setOnInsert: {
            _id: new Types.ObjectId(ROLE_IDS[role]),
            name: role,
          },
        },
        upsert: true,
      },
    }));

    const result = await this.roleModel.bulkWrite(operations);
    console.log(`✅ ${result.upsertedCount} roles seeded.`);
  }
}
