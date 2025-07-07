import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { ROLE_IDS } from 'src/common/constants/roles.constant';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { BcryptUtil } from 'src/common/utils/bcrypt.util';
import { School } from 'src/database/schemas/central/school.schema';
import { User } from 'src/database/schemas/central/user.schema';
import { MailService } from 'src/mail/mail.service';
import { CreateSchoolAdminDto } from './dto/create-school-admin.dto';
import { GlobalStudent } from 'src/database/schemas/central/global-student.schema';

@Injectable()
export class SchoolAdminService {
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
      throw new ConflictException('Student with this email already exists');
    }
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    if (existingSchool) {
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
      );

      await session.commitTransaction();

      return {
        message: 'School and Admin user created successfully',
        success: true,
      };
    } catch (error) {
      console.error('Error creating school admin:', error);
      await session.abortTransaction();

      if (error?.code === 11000) {
        throw new ConflictException('Email already exists');
      }

      throw new BadRequestException('Failed to create school admin');
    } finally {
      session.endSession();
    }
  }
}
