import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from 'src/database/schemas/central/user.schema';
import { Role } from 'src/database/schemas/central/role.schema';
import { BcryptUtil } from 'src/common/utils/bcrypt.util';
import { ROLE_IDS, RoleEnum } from 'src/common/constants/roles.constant';

@Injectable()
export class SuperAdminSeederService {
  private readonly logger = new Logger(SuperAdminSeederService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(Role.name)
    private readonly roleModel: Model<Role>,
    private readonly bcryptUtil: BcryptUtil,
  ) {}

  async seed() {
    this.logger.log('🔑 Seeding Super Admin...');

    try {
      // Check if Super Admin role exists
      const superAdminRole = await this.roleModel.findById(
        new Types.ObjectId(ROLE_IDS.SUPER_ADMIN),
      );
      if (!superAdminRole) {
        this.logger.error(
          'Super Admin role not found. Please run role seeder first.',
        );
        throw new Error('Super Admin role not found');
      }

      // Super Admin data
      const superAdminData = {
        email:
          process.env.SUPER_ADMIN_EMAIL || 'superadmin.aiprofessor@yopmail.com',
        password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123',
        first_name: 'Admin',
        last_name: '',
      };

      // Check if Super Admin already exists
      const existingSuperAdmin = await this.userModel.findOne({
        email: superAdminData.email,
        role: new Types.ObjectId(ROLE_IDS.SUPER_ADMIN),
      });

      if (existingSuperAdmin) {
        this.logger.warn(
          `Super Admin with email ${superAdminData.email} already exists`,
        );
        return;
      }

      // Hash password
      const hashedPassword = await this.bcryptUtil.hashPassword(
        superAdminData.password,
      );

      // Create Super Admin user
      await this.userModel.create({
        email: superAdminData.email,
        password: hashedPassword,
        first_name: superAdminData.first_name,
        last_name: superAdminData.last_name,
        role: new Types.ObjectId(ROLE_IDS.SUPER_ADMIN),
        // Super Admin doesn't belong to any specific school
        school_id: null,
      });

      this.logger.log(
        `✅ Super Admin created successfully with email: ${superAdminData.email}`,
      );
      this.logger.log(`🔐 Super Admin password: ${superAdminData.password}`);
      this.logger.warn(
        '⚠️  Please change the default password after first login!',
      );
    } catch (error) {
      this.logger.error(`❌ Failed to seed Super Admin: ${error.message}`);
      throw error;
    }
  }
}
