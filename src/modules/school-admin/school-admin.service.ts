import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from 'src/database/schemas/central/user.schema';
import { School } from 'src/database/schemas/central/school.schema';
import { CreateSchoolAdminDto } from './dto/create-school-admin.dto';
import { BcryptUtil } from 'src/common/utils/bcrypt.util';
import { ROLE_IDS } from 'src/common/constants/roles.constant';

@Injectable()
export class SchoolAdminService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly bcryptUtil: BcryptUtil,
  ) {}

  async createSchoolAdmin(createSchoolAdminDto: CreateSchoolAdminDto) {
    const { email, password, school_id, ...userData } = createSchoolAdminDto;

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(school_id)) {
      throw new BadRequestException('Invalid school ID format');
    }

    // Check if school exists
    const school = await this.schoolModel.findById(school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Check if user with email already exists
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    try {
      // Hash password
      const hashedPassword = await this.bcryptUtil.hashPassword(password);

      // Create school admin user
      const schoolAdmin = new this.userModel({
        ...userData,
        email,
        password: hashedPassword,
        school_id: new Types.ObjectId(school_id),
        role: new Types.ObjectId(ROLE_IDS.SCHOOL_ADMIN),
      });

      const savedUser = await schoolAdmin.save();

      // Return user without password
      const { password: _, ...userResponse } = savedUser.toObject();

      return {
        message: 'School admin created successfully',
        data: {
          user: userResponse,
          school: {
            id: school._id,
            name: school.name,
            email: school.email,
          },
        },
      };
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Email already exists');
      }
      throw new BadRequestException('Failed to create school admin');
    }
  }
}
