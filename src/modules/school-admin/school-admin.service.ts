import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { ROLE_IDS, RoleEnum } from 'src/common/constants/roles.constant';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { BcryptUtil } from 'src/common/utils/bcrypt.util';
import { School } from 'src/database/schemas/central/school.schema';
import { User } from 'src/database/schemas/central/user.schema';
import { MailService } from 'src/mail/mail.service';
import { CreateSchoolAdminDto } from './dto/create-school-admin.dto';
import { GlobalStudent } from 'src/database/schemas/central/global-student.schema';
import { UpdateSchoolDetailsDto } from './dto/update-school-details.dto';

@Injectable()
export class SchoolAdminService {
  private readonly logger = new Logger(SchoolAdminService.name);
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    @InjectModel(GlobalStudent.name)
    private readonly globalStudentModel: Model<GlobalStudent>,
    private readonly bcryptUtil: BcryptUtil,
    private readonly mailService: MailService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async createSchoolAdmin(
    createSchoolAdminDto: CreateSchoolAdminDto,
    user: JWTUserPayload,
  ) {
    const {
      school_email,
      school_name,
      school_website_url,
      user_email,
      user_first_name,
      user_last_name,
    } = createSchoolAdminDto;

    this.logger.log(
      `Creating school admin: ${user_email} for school: ${school_name}`,
    );

    const [existingUser, existingSchool, existingGlobalStudent] =
      await Promise.all([
        this.userModel.exists({ email: user_email }),
        this.schoolModel.exists({ email: school_email }),
        this.globalStudentModel.findOne({
          email: user_email,
        }),
      ]);

    // Check if the user is already a global student;
    if (existingGlobalStudent) {
      this.logger.warn(`Student with this email already exists: ${user_email}`);
      throw new ConflictException('Student with this email already exists');
    }
    if (existingUser) {
      this.logger.warn(`User with this email already exists: ${user_email}`);
      throw new ConflictException('User with this email already exists');
    }
    if (existingSchool) {
      this.logger.warn(
        `School with this email already exists: ${school_email}`,
      );
      throw new ConflictException('School with this email already exists');
    }

    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const db_name = school_name
        .toLowerCase()
        .replace(/[^a-z\s]/g, '')
        .trim()
        .replace(/\s+/g, '_');

      const [createdSchool] = await this.schoolModel.insertMany([
        {
          name: school_name,
          email: school_email,
          website_url: school_website_url,
          db_name,
          created_by: new Types.ObjectId(user.id),
        },
      ]);

      const password = this.bcryptUtil.generateStrongPassword();

      await this.userModel.insertMany([
        {
          email: user_email,
          first_name: user_first_name,
          school_id: createdSchool._id,
          password: await this.bcryptUtil.hashPassword(password),
          role: new Types.ObjectId(ROLE_IDS.SCHOOL_ADMIN),
          created_by: new Types.ObjectId(user.id),
        },
      ]);

      // Send email to the new school admin
      // Note: Email sending logic is not implemented here, but you can use a service like
      await this.mailService.sendCredentialsEmail(
        user_email,
        `${user_first_name}${user_last_name ? ` ${user_last_name}` : ''}`,
        password,
        RoleEnum.SCHOOL_ADMIN,
      );
      this.logger.log(`Credentials email sent to: ${user_email}`);

      await session.commitTransaction();
      this.logger.log(`Transaction committed for school admin: ${user_email}`);
      return {
        message: 'School and Admin user created successfully',
        success: true,
      };
    } catch (error) {
      this.logger.error('Error creating school admin', error?.stack || error);
      await session.abortTransaction();
      if (error?.code === 11000) {
        throw new ConflictException('Email already exists');
      }
      throw new BadRequestException('Failed to create school admin');
    } finally {
      session.endSession();
    }
  }

  async updateSchoolDetails(
    updateSchoolAdminDto: UpdateSchoolDetailsDto,
    userId: Types.ObjectId | string,
    schoolId: Types.ObjectId,
  ) {
    const school = await this.schoolModel.findById(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    // Authorization check
    if (school.created_by.toString() !== userId.toString()) {
      throw new BadRequestException(
        'You are not authorized to update this school',
      );
    }

    // Destructure all possible fields
    const {
      school_name,
      address,
      school_website_url,
      phone,
      country_code,
      timezone,
      language,
      logo,
    } = updateSchoolAdminDto || {};

    // Update fields conditionally
    if (school_name) {
      school.name = school_name;
    }
    if (address) {
      school.address = address;
    }
    if (school_website_url) {
      school.website_url = school_website_url;
    }
    if (phone) {
      school.phone = phone;
    }
    if (country_code) {
      school.country_code = country_code;
    }
    if (timezone) {
      school.timezone = timezone;
    }
    if (language) {
      school.language = language;
    }

    if (logo) {
      school.logo = logo;
    }

    school.updated_by = new Types.ObjectId(userId);

    try {
      const updatedSchool = await school.save();
      return {
        message: 'School details updated successfully',
        success: true,
        data: {
          _id: updatedSchool._id,
          school_name: updatedSchool.name,
          address: updatedSchool.address,
          school_website_url: updatedSchool.website_url,
          phone: updatedSchool.phone,
          country_code: updatedSchool.country_code,
          timezone: updatedSchool.timezone,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error updating school details for school ID: ${schoolId}`,
        error?.stack || error,
      );
      throw new BadRequestException('Failed to update school details');
    }
  }
}
