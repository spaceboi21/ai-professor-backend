import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
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
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GlobalStudent } from 'src/database/schemas/central/global-student.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';

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
    private readonly tenantConnectionService: TenantConnectionService,
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

        const dbNameExists = await this.schoolModel.exists({ db_name });
        if (dbNameExists) {
          this.logger.warn(`School with this name already exists: ${db_name}`);
          throw new ConflictException('School with this name already exists');
        }

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
        throw new ConflictException(error?.message || 'Failed to create school admin');
      }
      throw new BadRequestException('Failed to create school admin');
    } finally {
      session.endSession();
    }
  }

  async getDashboard(user: JWTUserPayload) {
    this.logger.log(`Getting dashboard for school admin: ${user.id}`);

    // Get school information
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);

    // Get counts for dashboard
    const [studentCount, professorCount] = await Promise.all([
      tenantConnection.model('Student').countDocuments({ deleted_at: null }),
      this.userModel.countDocuments({
        role: new Types.ObjectId(ROLE_IDS.PROFESSOR),
        school_id: user.school_id
          ? new Types.ObjectId(user.school_id)
          : undefined,
        deleted_at: null,
      }),
    ]);

    return {
      message: 'Dashboard information retrieved successfully',
      data: {
        school: {
          id: school._id,
          name: school.name,
          email: school.email,
          status: school.status,
        },
        counts: {
          students: studentCount,
          professors: professorCount,
        },
      },
    };
  }

  async resetPassword(userId: string, resetPasswordDto: ResetPasswordDto) {
    const { old_password, new_password } = resetPasswordDto;
    this.logger.log(`Resetting password for user: ${userId}`);

    // Find the school admin by ID
    const user = await this.userModel.findById(new Types.ObjectId(userId)).select('+password');
    if (!user) {
      this.logger.warn(`School admin not found: ${userId}`);
      throw new NotFoundException('User not found');
    }

    // Check if user is school admin or professor
    const userRoleId = user.role.toString();
    if (userRoleId !== ROLE_IDS.SCHOOL_ADMIN && userRoleId !== ROLE_IDS.PROFESSOR) {
      this.logger.warn(`Invalid user role for password reset: ${user.role}`);
      throw new BadRequestException('Invalid user type for password reset');
    }

    // Validate old password
    const isPasswordValid = await this.bcryptUtil.comparePassword(
      old_password,
      user.password,
    );

    if (!isPasswordValid) {
      this.logger.warn(`Invalid old password for user: ${userId}`);
      throw new BadRequestException('Invalid old password');
    }

    // Hash the new password
    const hashedNewPassword = await this.bcryptUtil.hashPassword(new_password);
    
    // Update the password
    user.password = hashedNewPassword;
    user.last_logged_in = new Date();
    
    try {
      const updatedUser = await user.save();
      this.logger.log(`Password updated successfully for user: ${user.email}`);
      
      return {
        message: 'Password updated successfully',
        data: {
          id: updatedUser._id,
          email: updatedUser.email,
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          school_id: updatedUser.school_id,
          created_at: updatedUser.created_at,
        },
      };
    } catch (error) {
      this.logger.error('Error updating password:', error);
      throw new BadRequestException('Failed to update password');
    }
  }
}
