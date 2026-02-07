import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BcryptUtil, JwtUtil } from 'src/common/utils';
import { User } from 'src/database/schemas/central/user.schema';
import { LoginSuperAdminDto } from './dto/super-admin-login.dto';
import { ROLE_IDS, RoleEnum } from 'src/common/constants/roles.constant';
import { Role } from 'src/database/schemas/central/role.schema';
import { LoginSchoolAdminDto } from './dto/school-admin-login.dto';
import { LoginStudentDto } from './dto/student-login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { SetNewPasswordDto } from './dto/set-new-password.dto';
import { School } from 'src/database/schemas/central/school.schema';
import { GlobalStudent } from 'src/database/schemas/central/global-student.schema';
import {
  Student,
  StudentSchema,
} from 'src/database/schemas/tenant/student.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { StatusEnum } from 'src/common/constants/status.constant';
import { MailService } from 'src/mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { TokenPair, TokenUtil } from 'src/common/utils/token.util';
import { UpdatePreferredLanguageDto } from './dto/update-preferred-language.dto';
import { LanguageEnum } from 'src/common/constants/language.constant';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { DEFAULT_LANGUAGE } from 'src/common/constants/language.constant';
import { ErrorMessageService } from 'src/common/services/error-message.service';
import { EmailEncryptionService } from 'src/common/services/email-encryption.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { ActivityTypeEnum } from 'src/common/constants/activity.constant';
import { getActivityDescription } from 'src/common/constants/activity-descriptions.constant';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(Role.name)
    private readonly roleModel: Model<Role>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    @InjectModel(GlobalStudent.name)
    private readonly globalStudentModel: Model<GlobalStudent>,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly bcryptUtil: BcryptUtil,
    private readonly jwtUtil: JwtUtil,
    private readonly tokenUtil: TokenUtil,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly errorMessageService: ErrorMessageService,
    private readonly emailEncryptionService: EmailEncryptionService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async superAdminLogin(loginData: LoginSuperAdminDto, req: Request) {
    const { email, password, rememberMe, preferred_language } = loginData;
    this.logger.log(`SuperAdmin login attempt: ${email}`);

    const encryptedEmail = this.emailEncryptionService.encryptEmail(email);
    const isSuperAdminExists = (await this.userModel
      .findOne({
        email: encryptedEmail,
        role: new Types.ObjectId(ROLE_IDS.SUPER_ADMIN),
      })
      .select('+password')
      .populate({
        path: 'role',
        select: 'name',
      })) as (User & { role: Role }) | null;

    if (!isSuperAdminExists) {
      this.logger.warn(`Super Admin not found: ${email}`);
      throw new NotFoundException({
        message: {
          en: this.errorMessageService.getMessageWithLanguage(
            'USER',
            'NOT_FOUND',
            LanguageEnum.ENGLISH,
          ),
          fr: this.errorMessageService.getMessageWithLanguage(
            'USER',
            'NOT_FOUND',
            LanguageEnum.FRENCH,
          ),
        },
      });
    }

    // Check user status
    if (isSuperAdminExists.status === StatusEnum.INACTIVE) {
      this.logger.warn(`Super Admin account is inactive: ${email}`);
      throw new BadRequestException({
        message: this.errorMessageService.getMessageWithLanguage(
          'USER',
          'ACCOUNT_DEACTIVATED',
          isSuperAdminExists.preferred_language,
        ),
        error: 'Account Deactivated',
        statusCode: 400,
      });
    }

    const isPasswordMatch = await this.bcryptUtil.comparePassword(
      password,
      isSuperAdminExists.password,
    );

    if (!isPasswordMatch) {
      this.logger.warn(`Invalid email or password for Super Admin: ${email}`);
      throw new BadRequestException({
        message: this.errorMessageService.getMessageWithLanguage(
          'AUTH',
          'INVALID_EMAIL_PASSWORD',
          preferred_language || DEFAULT_LANGUAGE,
        ),
      });
    }

    // Update preferred language if provided
    let updatedPreferredLanguage = isSuperAdminExists.preferred_language;
    if (
      preferred_language &&
      preferred_language !== isSuperAdminExists.preferred_language
    ) {
      await this.userModel.findByIdAndUpdate(isSuperAdminExists._id, {
        preferred_language,
        updated_at: new Date(),
      });
      updatedPreferredLanguage = preferred_language;
      this.logger.log(
        `Updated preferred language for Super Admin ${email} to ${preferred_language}`,
      );
    }

    const tokenPair = this.tokenUtil.generateTokenPair({
      email: email, // Decrypted email
      id: isSuperAdminExists._id.toString(),
      role_id: isSuperAdminExists.role._id.toString(),
      role_name: isSuperAdminExists.role.name as RoleEnum,
      school_id: isSuperAdminExists.school_id?.toString(),
    });

    await this.userModel.findByIdAndUpdate(isSuperAdminExists._id, {
      last_logged_in: new Date(),
    });

    this.logger.log(`SuperAdmin login successful: ${email}`);

    // Get school details if super admin has school_id
    let schoolDetails: { name: string; logo: string } | null = null;
    if (isSuperAdminExists.school_id) {
      const school = await this.schoolModel.findById(
        isSuperAdminExists.school_id,
      );
      if (school) {
        schoolDetails = {
          name: school.name,
          logo: school.logo,
        };
      }
    }

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'AUTH',
        'LOGIN_SUCCESSFUL',
        updatedPreferredLanguage || DEFAULT_LANGUAGE,
      ),
      ...tokenPair,
      user: {
        email: email, // Decrypted email
        first_name: isSuperAdminExists.first_name,
        last_name: isSuperAdminExists.last_name,
        role: isSuperAdminExists.role.toString(),
        _id: isSuperAdminExists._id.toString(),
        preferred_language: updatedPreferredLanguage || DEFAULT_LANGUAGE,
        profile_pic: isSuperAdminExists.profile_pic,
      },
      ...(schoolDetails && { school: schoolDetails }),
    };
  }

  async schoolAdminLogin(
    loginSchoolAdminDto: LoginSchoolAdminDto,
    req: Request,
  ) {
    const { email, password, rememberMe, preferred_language } =
      loginSchoolAdminDto;
    this.logger.log(`SchoolAdmin login attempt: ${email}`);

    const encryptedEmail = this.emailEncryptionService.encryptEmail(email);
    const user = (await this.userModel
      .findOne({
        email: encryptedEmail,
        role: {
          $in: [
            new Types.ObjectId(ROLE_IDS.SCHOOL_ADMIN),
            new Types.ObjectId(ROLE_IDS.PROFESSOR),
          ],
        },
      })
      .select('+password')
      .populate({
        path: 'role',
        select: 'name',
      })) as (User & { role: Role }) | null;

    if (!user) {
      this.logger.warn(`School Admin not found: ${email}`);
      throw new NotFoundException({
        message: {
          en: this.errorMessageService.getMessageWithLanguage(
            'USER',
            'NOT_FOUND_WITH_EMAIL',
            LanguageEnum.ENGLISH,
          ),
          fr: this.errorMessageService.getMessageWithLanguage(
            'USER',
            'NOT_FOUND_WITH_EMAIL',
            LanguageEnum.FRENCH,
          ),
        },
      });
    }

    // Check user status
    if (user.status === StatusEnum.INACTIVE) {
      this.logger.warn(`School Admin account is inactive: ${email}`);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'USER',
          'ACCOUNT_DEACTIVATED',
          user.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const isPasswordValid = await this.bcryptUtil.comparePassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      this.logger.warn(`Invalid email or password for School Admin: ${email}`);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'AUTH',
          'INVALID_EMAIL_PASSWORD',
          user.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      this.logger.warn(`School not found for School Admin: ${email}`);
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND_FOR_USER',
          user.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Check school status
    if (school.status === StatusEnum.INACTIVE) {
      this.logger.warn(`School is inactive for School Admin: ${email}`);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'ACCOUNT_DEACTIVATED',
          preferred_language || user.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Update preferred language if provided
    let updatedPreferredLanguage = user.preferred_language;
    if (preferred_language && preferred_language !== user.preferred_language) {
      await this.userModel.findByIdAndUpdate(user._id, {
        preferred_language,
        updated_at: new Date(),
      });
      updatedPreferredLanguage = preferred_language;
      this.logger.log(
        `Updated preferred language for School Admin ${email} to ${preferred_language}`,
      );
    }

    const tokenPair = this.tokenUtil.generateTokenPair({
      id: user._id.toString(),
      email: email, // Decrypted email
      role_id: user.role._id.toString(),
      school_id: school._id.toString(),
      role_name: user.role.name as RoleEnum,
    });

    await this.userModel.findByIdAndUpdate(user._id, {
      last_logged_in: new Date(),
    });

    this.logger.log(`SchoolAdmin login successful: ${email}`);

    // Log successful login activity
    try {
      const description = getActivityDescription(
        ActivityTypeEnum.USER_LOGIN,
        true,
      );
      await this.activityLogService.createActivityLog({
        activity_type: ActivityTypeEnum.USER_LOGIN,
        description: {
          en: description.en,
          fr: description.fr,
        },
        performed_by: user._id,
        performed_by_role: user.role.name as RoleEnum,
        school_id: school._id,
        school_name: school.name,
        ip_address: req.ip || 'unknown',
        user_agent: req.headers['user-agent'] || 'unknown',
        is_success: true,
        endpoint: req.url || '/api/auth/school-admin/login',
        http_method: req.method || 'POST',
        http_status_code: 200,
        status: 'SUCCESS',
        metadata: {
          login_type: 'school_admin',
          user_role: user.role.name,
        },
      });
    } catch (error) {
      this.logger.error('Failed to log school admin login activity:', error);
      // Don't throw error to not break login flow
    }

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'AUTH',
        'LOGIN_SUCCESSFUL',
        updatedPreferredLanguage || DEFAULT_LANGUAGE,
      ),
      ...tokenPair,
      user: {
        id: user._id.toString(),
        email: email, // // Decrypted email
        first_name: user.first_name,
        last_name: user.last_name,
        school_id: school._id.toString(),
        role: user.role._id.toString(),
        role_name: user.role.name as RoleEnum,
        preferred_language: updatedPreferredLanguage || DEFAULT_LANGUAGE,
        profile_pic: user.profile_pic,
      },
      school: {
        name: school.name,
        logo: school.logo,
      },
    };
  }

  async studentLogin(loginStudentDto: LoginStudentDto, req: Request) {
    const { email, password, rememberMe, preferred_language } = loginStudentDto;
    this.logger.log(`Student login attempt: ${email}`);

    // First, find the student in the global students collection
    const encryptedEmail = this.emailEncryptionService.encryptEmail(email);
    const globalStudent = await this.globalStudentModel.findOne({
      email: encryptedEmail,
    });

    if (!globalStudent) {
      this.logger.warn(`Global student not found: ${email}`);
      throw new NotFoundException({
        message: {
          en: this.errorMessageService.getMessageWithLanguage(
            'STUDENT',
            'NOT_FOUND_WITH_EMAIL',
            LanguageEnum.ENGLISH,
          ),
          fr: this.errorMessageService.getMessageWithLanguage(
            'STUDENT',
            'NOT_FOUND_WITH_EMAIL',
            LanguageEnum.FRENCH,
          ),
        },
      });
    }

    // Get the school information
    const school = await this.schoolModel.findById(globalStudent.school_id);
    if (!school) {
      this.logger.warn(`School not found for student: ${email}`);
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND_FOR_STUDENT',
          DEFAULT_LANGUAGE,
        ),
      );
    }

    // Check school status
    if (school.status === StatusEnum.INACTIVE) {
      this.logger.warn(`School is inactive for student: ${email}`);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'ACCOUNT_DEACTIVATED',
          DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StudentModel = tenantConnection.model(Student.name, StudentSchema);

    // Find the student in the tenant database
    const student = await StudentModel.findOne({
      email: encryptedEmail,
      deleted_at: null,
    }).select('+password');

    if (!student) {
      this.logger.warn(`Student not found in school DB: ${email}`);
      throw new NotFoundException({
        message: {
          en: this.errorMessageService.getMessageWithLanguage(
            'STUDENT',
            'NOT_FOUND_IN_SCHOOL',
            LanguageEnum.ENGLISH,
          ),
          fr: this.errorMessageService.getMessageWithLanguage(
            'STUDENT',
            'NOT_FOUND_IN_SCHOOL',
            LanguageEnum.FRENCH,
          ),
        },
      });
    }

    // Check student status
    if (student.status === StatusEnum.INACTIVE) {
      this.logger.warn(`Student account is inactive: ${email}`);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'ACCOUNT_DEACTIVATED',
          student.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Verify password
    const isPasswordValid = await this.bcryptUtil.comparePassword(
      password,
      student.password,
    );

    if (!isPasswordValid) {
      this.logger.warn(`Invalid email or password for Student: ${email}`);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'AUTH',
          'INVALID_EMAIL_PASSWORD',
          preferred_language || student.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Update preferred language if provided
    let updatedPreferredLanguage = student.preferred_language;
    if (
      preferred_language &&
      preferred_language !== student.preferred_language
    ) {
      await StudentModel.findByIdAndUpdate(student._id, {
        preferred_language,
        updated_at: new Date(),
      });
      updatedPreferredLanguage = preferred_language;
      this.logger.log(
        `Updated preferred language for Student ${email} to ${preferred_language}`,
      );
    }

    const tokenPair = this.tokenUtil.generateTokenPair({
      id: student._id.toString(),
      email: email, // Decrypted email
      role_id: ROLE_IDS.STUDENT,
      school_id: school._id.toString(),
      role_name: RoleEnum.STUDENT,
    });

    await StudentModel.findByIdAndUpdate(student._id, {
      last_logged_in: new Date(),
    });

    // Get preferred language from student data
    const finalPreferredLanguage = updatedPreferredLanguage || DEFAULT_LANGUAGE;

    this.logger.log(`Student login successful: ${email}`);

    // Log successful student login activity
    try {
      const description = getActivityDescription(
        ActivityTypeEnum.USER_LOGIN,
        true,
      );
      await this.activityLogService.createActivityLog({
        activity_type: ActivityTypeEnum.USER_LOGIN,
        description: {
          en: description.en,
          fr: description.fr,
        },
        performed_by: student._id,
        performed_by_role: RoleEnum.STUDENT,
        school_id: school._id,
        school_name: school.name,
        ip_address: req.ip || 'unknown',
        user_agent: req.headers['user-agent'] || 'unknown',
        is_success: true,
        endpoint: req.url || '/api/auth/student/login',
        http_method: req.method || 'POST',
        http_status_code: 200,
        status: 'SUCCESS',
        metadata: {
          login_type: 'student',
          student_code: student.student_code,
        },
      });
    } catch (error) {
      this.logger.error('Failed to log student login activity:', error);
      // Don't throw error to not break login flow
    }

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'AUTH',
        'LOGIN_SUCCESSFUL',
        finalPreferredLanguage,
      ),
      ...tokenPair,
      user: {
        id: student._id,
        email: email, // // Decrypted email
        first_name: student.first_name,
        last_name: student.last_name,
        student_code: student.student_code,
        school_id: school._id.toString(),
        role: ROLE_IDS.STUDENT,
        preferred_language: finalPreferredLanguage,
        profile_pic: student.profile_pic,
      },
      school: {
        name: school.name,
        logo: school.logo,
      },
    };
  }

  async refreshToken(refreshToken: string, req: Request) {
    try {
      // Verify refresh token
      const payload = this.tokenUtil.verifyRefreshToken(refreshToken);

      // Generate new token pair
      const newTokenPair = this.tokenUtil.generateTokenPair({
        id: payload.id,
        email: payload.email,
        role_id: payload.role_id,
        role_name: payload.role_name,
        school_id: payload.school_id,
      });

      this.logger.log(
        `Token refreshed successfully for user: ${payload.email}`,
      );

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'AUTH',
          'TOKEN_REFRESHED_SUCCESSFULLY',
          DEFAULT_LANGUAGE,
        ),
        ...newTokenPair,
      };
    } catch (error) {
      this.logger.warn(`Token refresh failed: ${error.message}`);
      throw new UnauthorizedException(
        this.errorMessageService.getMessageWithLanguage(
          'AUTH',
          'INVALID_REFRESH_TOKEN',
          DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  async getMe(user: any) {
    this.logger.log(
      `getMe called for user id: ${user.id}, role: ${user.role.name}`,
    );
    // user: JWTUserPayload from JwtStrategy
    if (user.role.name === RoleEnum.STUDENT) {
      // Get student details from tenant DB
      const school = await this.schoolModel.findById(user.school_id);
      if (!school) {
        this.logger.warn(`School not found for student getMe: ${user.id}`);
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'SCHOOL',
            'NOT_FOUND',
            DEFAULT_LANGUAGE,
          ),
        );
      }

      const tenantConnection =
        await this.tenantConnectionService.getTenantConnection(school.db_name);

      const StudentModel = tenantConnection.model(Student.name, StudentSchema);

      const student = await StudentModel.findOne({
        _id: user.id,
        role: new Types.ObjectId(user.role.id),
      }).lean();

      if (!student) {
        this.logger.warn(`Student not found in getMe: ${user.id}`);
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'STUDENT',
            'NOT_FOUND',
            DEFAULT_LANGUAGE,
          ),
        );
      }

      // Decrypt the email before returning
      const decryptedStudent = this.emailEncryptionService.decryptEmailFields(
        student,
        ['email'],
      );

      return {
        ...decryptedStudent,
        role: user.role, // role from JWT (already populated)
        preferred_language: student.preferred_language || DEFAULT_LANGUAGE,
        school: {
          name: school.name,
          logo: school.logo,
        },
      };
    } else {
      // For other roles, get from central userModel
      const userData = await this.userModel
        .findById(user.id)
        .populate({
          path: 'role',
          select: 'name',
        })
        .lean();

      if (!userData) {
        this.logger.warn(`User not found in getMe: ${user.id}`);
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'USER',
            'NOT_FOUND',
            DEFAULT_LANGUAGE,
          ),
        );
      }

      // Decrypt the email before returning
      const decryptedUserData = this.emailEncryptionService.decryptEmailFields(
        userData,
        ['email'],
      );

      // Get school information for school admin/professor users
      let schoolDetails: { name: string; logo: string } | null = null;
      if (userData.school_id) {
        const school = await this.schoolModel.findById(userData.school_id);
        if (school) {
          schoolDetails = {
            name: school.name,
            logo: school.logo,
          };
        }
      }

      return {
        ...decryptedUserData,
        role: user.role, // role from JWT (already populated)
        preferred_language: userData.preferred_language || DEFAULT_LANGUAGE,
        profile_pic: userData.profile_pic,
        ...(schoolDetails && { school: schoolDetails }),
      };
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    this.logger.log(`Forgot password request for email: ${email}`);

    // First, check if email exists in school admin/professor users
    const encryptedEmail = this.emailEncryptionService.encryptEmail(email);
    const schoolUser = await this.userModel
      .findOne({
        email: encryptedEmail,
        role: {
          $in: [
            new Types.ObjectId(ROLE_IDS.SCHOOL_ADMIN),
            new Types.ObjectId(ROLE_IDS.PROFESSOR),
          ],
        },
      })
      .populate({
        path: 'role',
        select: 'name',
      });

    if (schoolUser) {
      schoolUser.email = email; // Decrypted email
      // Handle school admin/professor forgot password
      return this.handleSchoolUserForgotPassword(schoolUser);
    }

    // If not found in school users, check if it's a student
    const globalStudent = await this.globalStudentModel.findOne({
      email: encryptedEmail,
    });
    if (!globalStudent) {
      this.logger.warn(`User not found for forgot password: ${email}`);
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'USER',
          'NOT_FOUND_WITH_EMAIL',
          DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get the school information for the student
    const school = await this.schoolModel.findById(globalStudent.school_id);
    if (!school) {
      this.logger.warn(`School not found for student: ${email}`);
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND_FOR_STUDENT',
          DEFAULT_LANGUAGE,
        ),
      );
    }

    // Check school status
    if (school.status === StatusEnum.INACTIVE) {
      this.logger.warn(`School is inactive for student: ${email}`);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'ACCOUNT_DEACTIVATED',
          DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StudentModel = tenantConnection.model(Student.name, StudentSchema);

    // Find the student in the tenant database
    const student = await StudentModel.findOne({
      email: encryptedEmail,
      deleted_at: null,
    });

    if (!student) {
      this.logger.warn(`Student not found in school DB: ${email}`);
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'NOT_FOUND_IN_SCHOOL',
          DEFAULT_LANGUAGE,
        ),
      );
    }

    // Check student status
    if (student.status === StatusEnum.INACTIVE) {
      this.logger.warn(`Student account is inactive: ${email}`);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'ACCOUNT_DEACTIVATED',
          student.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    student.email = email; // Decrypted email
    // Handle student forgot password
    return this.handleStudentForgotPassword(student, school);
  }

  private async handleSchoolUserForgotPassword(user: any) {
    // Check user status
    if (user.status === StatusEnum.INACTIVE) {
      this.logger.warn(
        `User account is inactive for forgot password: ${user.email}`,
      );
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'USER',
          'ACCOUNT_DEACTIVATED',
          user.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = this.jwtUtil.generateToken({
      id: user._id.toString(),
      email: user.email,
      role_id: user.role._id.toString(),
      role_name: (user.role as any).name as RoleEnum,
      school_id: user.school_id?.toString(),
    });

    // Create reset password link - serve from backend based on language preference
    const backendUrl =
      this.configService.get<string>('BACKEND_URL') || 'http://localhost:3000';
    const userLanguage = user.preferred_language || DEFAULT_LANGUAGE;
    const resetPasswordLink =
      userLanguage === LanguageEnum.FRENCH
        ? `${backendUrl}/static/reset-password-fr.html?token=${resetToken}`
        : `${backendUrl}/static/reset-password.html?token=${resetToken}`;

    // Send email
    try {
      await this.mailService.sendPasswordResetEmail(
        user.email,
        `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}`,
        resetPasswordLink,
        user.preferred_language,
      );
      this.logger.log(
        `Password reset email sent to school user: ${user.email}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to: ${user.email}`,
        error,
      );
      throw new BadRequestException('Failed to send password reset email');
    }

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'AUTH',
        'PASSWORD_RESET_LINK_SENT',
        user.preferred_language || DEFAULT_LANGUAGE,
      ),
    };
  }

  private async handleStudentForgotPassword(student: any, school: any) {
    // Generate reset token for student (valid for 1 hour)
    const resetToken = this.jwtUtil.generateToken({
      id: student._id.toString(),
      email: student.email,
      role_id: ROLE_IDS.STUDENT,
      role_name: RoleEnum.STUDENT,
      school_id: school._id.toString(),
    });

    // Create reset password link - serve from backend based on language preference
    const backendUrl =
      this.configService.get<string>('BACKEND_URL') || 'http://localhost:3000';
    const studentLanguage = student.preferred_language || DEFAULT_LANGUAGE;
    const resetPasswordLink =
      studentLanguage === LanguageEnum.FRENCH
        ? `${backendUrl}/static/reset-password-fr.html?token=${resetToken}`
        : `${backendUrl}/static/reset-password.html?token=${resetToken}`;

    // Send email
    try {
      await this.mailService.sendPasswordResetEmail(
        student.email,
        `${student.first_name}${student.last_name ? ` ${student.last_name}` : ''}`,
        resetPasswordLink,
        student.preferred_language,
      );
      this.logger.log(`Password reset email sent to student: ${student.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to: ${student.email}`,
        error,
      );
      throw new BadRequestException('Failed to send password reset email');
    }

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'AUTH',
        'PASSWORD_RESET_LINK_SENT',
        student.preferred_language || DEFAULT_LANGUAGE,
      ),
    };
  }

  async setNewPassword(setNewPasswordDto: SetNewPasswordDto) {
    const { token, new_password, current_password } = setNewPasswordDto;
    this.logger.log('Setting new password with token');

    try {
      // Verify the token
      const payload = this.jwtUtil.verifyToken(token);

      // Check if it's a student or school user based on role
      if (payload.role_name === RoleEnum.STUDENT) {
        return this.handleStudentPasswordReset(
          payload,
          new_password,
          current_password,
        );
      } else {
        return this.handleSchoolUserPasswordReset(
          payload,
          new_password,
          current_password,
        );
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Error setting new password:', error);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'AUTH',
          'INVALID_OR_EXPIRED_RESET_TOKEN',
          DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  private async handleSchoolUserPasswordReset(
    payload: any,
    new_password: string,
    current_password?: string,
  ) {
    // Find the school user
    const user = await this.userModel.findById(payload.id).select('+password');
    if (!user) {
      this.logger.warn(
        `School user not found for password reset: ${payload.id}`,
      );
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'AUTH',
          'INVALID_RESET_TOKEN',
          DEFAULT_LANGUAGE,
        ),
      );
    }

    // Check if user is school admin or professor
    const userRoleId = user.role.toString();
    if (
      userRoleId !== ROLE_IDS.SCHOOL_ADMIN &&
      userRoleId !== ROLE_IDS.PROFESSOR
    ) {
      this.logger.warn(`Invalid user role for password reset: ${user.role}`);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'AUTH',
          'INVALID_USER_TYPE_RESET',
          user.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Check user status
    if (user.status === StatusEnum.INACTIVE) {
      this.logger.warn(
        `User account is inactive for password reset: ${user.email}`,
      );
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'USER',
          'ACCOUNT_DEACTIVATED',
          user.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // If current_password is provided, validate it
    if (current_password) {
      const isCurrentPasswordMatch = await this.bcryptUtil.comparePassword(
        current_password,
        user.password,
      );
      if (!isCurrentPasswordMatch) {
        this.logger.warn(
          `Current password mismatch for password reset: ${user.email}`,
        );
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'AUTH',
            'CURRENT_PASSWORD_MISMATCH',
            user.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
    }

    // Hash the new password
    const hashedPassword = await this.bcryptUtil.hashPassword(new_password);

    // Update the password
    user.password = hashedPassword;
    user.last_logged_in = new Date();

    await user.save();

    this.logger.log(
      `Password updated successfully for school user: ${user.email}`,
    );

    // Decrypt the email before returning
    const decryptedUser = this.emailEncryptionService.decryptEmailFields(user, [
      'email',
    ]);

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'AUTH',
        'PASSWORD_UPDATED_SUCCESSFULLY',
        user?.preferred_language || DEFAULT_LANGUAGE,
      ),
      data: {
        id: user._id,
        email: decryptedUser.email, // Decrypted email
        first_name: user.first_name,
        last_name: user.last_name,
      },
    };
  }

  private async handleStudentPasswordReset(
    payload: any,
    new_password: string,
    current_password?: string,
  ) {
    // Get the school information
    const school = await this.schoolModel.findById(payload.school_id);
    if (!school) {
      this.logger.warn(
        `School not found for student password reset: ${payload.school_id}`,
      );
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StudentModel = tenantConnection.model(Student.name, StudentSchema);

    // Find the student in the tenant database
    const student = await StudentModel.findById(payload.id).select('+password');
    if (!student) {
      this.logger.warn(`Student not found for password reset: ${payload.id}`);
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'INVALID_RESET_TOKEN',
          DEFAULT_LANGUAGE,
        ),
      );
    }

    // Check student status
    if (student.status === StatusEnum.INACTIVE) {
      this.logger.warn(
        `Student account is inactive for password reset: ${student.email}`,
      );
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'ACCOUNT_DEACTIVATED',
          student.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // If current_password is provided, validate it
    if (current_password) {
      const isCurrentPasswordMatch = await this.bcryptUtil.comparePassword(
        current_password,
        student.password,
      );
      if (!isCurrentPasswordMatch) {
        this.logger.warn(
          `Current password mismatch for student password reset: ${student.email}`,
        );
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'AUTH',
            'CURRENT_PASSWORD_MISMATCH',
            student.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
    }

    // Hash the new password
    const hashedPassword = await this.bcryptUtil.hashPassword(new_password);

    // Update the password
    student.password = hashedPassword;
    student.last_logged_in = new Date();

    await student.save();

    this.logger.log(
      `Password updated successfully for student: ${student.email}`,
    );

    // Decrypt the email before returning
    const decryptedStudent = this.emailEncryptionService.decryptEmailFields(
      student,
      ['email'],
    );

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'AUTH',
        'PASSWORD_UPDATED_SUCCESSFULLY',
        student?.preferred_language || DEFAULT_LANGUAGE,
      ),
      data: {
        id: student._id,
        email: decryptedStudent.email, // Decrypted email
        first_name: student.first_name,
        last_name: student.last_name,
        student_code: student.student_code,
      },
    };
  }

  async updatePreferredLanguage(
    user: JWTUserPayload,
    updatePreferredLanguageDto: UpdatePreferredLanguageDto,
  ) {
    this.logger.log(
      `Update preferred language called for user id: ${user.id}, role: ${user.role.name}`,
    );

    if (user.role.name === RoleEnum.STUDENT) {
      // Handle student preferred language update in tenant database
      const school = await this.schoolModel.findById(user.school_id);
      if (!school) {
        this.logger.warn(`School not found for student: ${user.id}`);
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'SCHOOL',
            'NOT_FOUND',
            user.preferred_language ||
              updatePreferredLanguageDto.preferred_language ||
              DEFAULT_LANGUAGE,
          ),
        );
      }

      const tenantConnection =
        await this.tenantConnectionService.getTenantConnection(school.db_name);

      const StudentModel = tenantConnection.model(Student.name, StudentSchema);

      // Update the student's preferred language in tenant database
      const updatedStudent = await StudentModel.findByIdAndUpdate(
        user.id,
        {
          preferred_language: updatePreferredLanguageDto.preferred_language,
          updated_at: new Date(),
        },
        { new: true },
      ).lean();

      if (!updatedStudent) {
        this.logger.warn(
          `Student not found for update in tenant DB: ${user.id}`,
        );
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'STUDENT',
            'NOT_FOUND',
            DEFAULT_LANGUAGE,
          ),
        );
      }

      this.logger.log(
        `Preferred language updated for student ${user.id} to ${updatePreferredLanguageDto.preferred_language}`,
      );

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'AUTH',
          'PREFERRED_LANGUAGE_UPDATED_SUCCESSFULLY',
          updatedStudent?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: {
          user_id: updatedStudent._id,
          preferred_language: updatedStudent.preferred_language,
          updated_at: updatedStudent.updated_at,
        },
      };
    } else {
      // Handle other user types (Super Admin, School Admin, Professor) in central database
      const updatedUser = await this.userModel
        .findByIdAndUpdate(
          user.id,
          {
            preferred_language: updatePreferredLanguageDto.preferred_language,
            updated_at: new Date(),
          },
          { new: true },
        )
        .lean();

      if (!updatedUser) {
        this.logger.warn(`User not found for update in central DB: ${user.id}`);
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'USER',
            'NOT_FOUND',
            DEFAULT_LANGUAGE,
          ),
        );
      }

      this.logger.log(
        `Preferred language updated for user ${user.id} to ${updatePreferredLanguageDto.preferred_language}`,
      );

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'AUTH',
          'PREFERRED_LANGUAGE_UPDATED_SUCCESSFULLY',
          updatedUser?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: {
          user_id: updatedUser._id,
          preferred_language: updatedUser.preferred_language,
          updated_at: updatedUser.updated_at,
        },
      };
    }
  }

  /**
   * Check if email has multiple accounts
   */
  async checkMultipleAccounts(email: string): Promise<{
    has_multiple_accounts: boolean;
    accounts_count: number;
    accounts: any[];
  }> {
    this.logger.log(`Checking multiple accounts for email: ${email}`);

    const encryptedEmail = this.emailEncryptionService.encryptEmail(email);

    const accounts = await this.userModel
      .find({
        email: encryptedEmail,
        deleted_at: null,
        status: StatusEnum.ACTIVE,
      })
      .populate('role', 'name')
      .populate('school_id', 'name')
      .select('_id first_name last_name username account_code role school_id status')
      .lean();

    const accountList = accounts.map((account: any) => ({
      account_id: account._id.toString(),
      school_name: account.school_id?.name || 'N/A',
      school_id: account.school_id?._id?.toString() || null,
      role_name: account.role?.name || 'Unknown',
      username: account.username || null,
      account_code: account.account_code || null,
      first_name: account.first_name,
      last_name: account.last_name,
      status: account.status,
    }));

    return {
      has_multiple_accounts: accounts.length > 1,
      accounts_count: accounts.length,
      accounts: accountList,
    };
  }

  /**
   * Unified login with account selection support
   */
  async unifiedLogin(
    email: string,
    password: string,
    accountId?: string,
    rememberMe: boolean = false,
    preferred_language?: LanguageEnum,
    req?: Request,
  ): Promise<any> {
    this.logger.log(`Unified login attempt for: ${email}`);

    const encryptedEmail = this.emailEncryptionService.encryptEmail(email);

    // Find all active accounts with this email
    const accounts = await this.userModel
      .find({
        email: encryptedEmail,
        deleted_at: null,
        status: StatusEnum.ACTIVE,
      })
      .select('+password')
      .populate('role', 'name')
      .populate('school_id', 'name db_name')
      .lean();

    if (accounts.length === 0) {
      throw new UnauthorizedException({
        message: {
          en: 'User not found or account is inactive',
          fr: 'Utilisateur introuvable ou compte inactif',
        },
      });
    }

    // Verify password with first account (all accounts should have same password)
    const isPasswordMatch = await this.bcryptUtil.comparePassword(
      password,
      accounts[0].password,
    );

    if (!isPasswordMatch) {
      throw new BadRequestException({
        message: {
          en: 'Invalid email or password',
          fr: 'Email ou mot de passe invalide',
        },
      });
    }

    // If multiple accounts exist and no account ID provided, return account selection
    if (accounts.length > 1 && !accountId) {
      const accountList = accounts.map((account: any) => ({
        account_id: account._id.toString(),
        school_name: account.school_id?.name || 'N/A',
        school_id: account.school_id?._id?.toString() || null,
        role_name: account.role?.name || 'Unknown',
        username: account.username || null,
        account_code: account.account_code || null,
        first_name: account.first_name,
        last_name: account.last_name,
        status: account.status,
      }));

      return {
        requires_account_selection: true,
        accounts_count: accounts.length,
        accounts: accountList,
        message: 'Multiple accounts found. Please select an account to continue.',
      };
    }

    // Select the account
    let selectedAccount;
    if (accountId) {
      selectedAccount = accounts.find(acc => acc._id.toString() === accountId);
      if (!selectedAccount) {
        throw new BadRequestException('Invalid account selection');
      }
    } else {
      // Single account, use it
      selectedAccount = accounts[0];
    }

    // Update preferred language if provided
    let updatedPreferredLanguage = selectedAccount.preferred_language;
    if (preferred_language && preferred_language !== selectedAccount.preferred_language) {
      await this.userModel.findByIdAndUpdate(selectedAccount._id, {
        preferred_language,
        last_logged_in: new Date(),
      });
      updatedPreferredLanguage = preferred_language;
    } else {
      await this.userModel.findByIdAndUpdate(selectedAccount._id, {
        last_logged_in: new Date(),
      });
    }

    // Generate tokens
    const tokenPair = this.tokenUtil.generateTokenPair({
      email: email, // Decrypted email
      id: selectedAccount._id.toString(),
      role_id: selectedAccount.role._id.toString(),
      role_name: selectedAccount.role.name as RoleEnum,
      school_id: selectedAccount.school_id?._id?.toString(),
      username: selectedAccount.username,
      account_code: selectedAccount.account_code,
    });

    // Log activity
    if (req) {
      try {
        const description = getActivityDescription(ActivityTypeEnum.USER_LOGIN, true);
        await this.activityLogService.createActivityLog({
          activity_type: ActivityTypeEnum.USER_LOGIN,
          description: {
            en: description.en,
            fr: description.fr,
          },
          performed_by: selectedAccount._id,
          performed_by_role: selectedAccount.role.name as RoleEnum,
          school_id: selectedAccount.school_id?._id,
          school_name: selectedAccount.school_id?.name,
          ip_address: req.ip || 'unknown',
          user_agent: req.headers['user-agent'] || 'unknown',
          is_success: true,
          endpoint: req.url || '/api/auth/unified-login',
          http_method: req.method || 'POST',
          http_status_code: 200,
          status: 'SUCCESS',
          metadata: {
            login_type: 'unified',
            user_role: selectedAccount.role.name,
            account_id: selectedAccount._id.toString(),
          },
        });
      } catch (error) {
        this.logger.error('Failed to log unified login activity:', error);
        // Don't throw error to not break login flow
      }
    }

    return {
      message: 'Login successful',
      data: {
        access_token: tokenPair.access_token,
        refresh_token: tokenPair.refresh_token,
        user: {
          id: selectedAccount._id.toString(),
          email: email,
          first_name: selectedAccount.first_name,
          last_name: selectedAccount.last_name,
          username: selectedAccount.username,
          account_code: selectedAccount.account_code,
          role: {
            _id: selectedAccount.role._id.toString(),
            name: selectedAccount.role.name,
          },
          school: selectedAccount.school_id
            ? {
                _id: selectedAccount.school_id._id.toString(),
                name: selectedAccount.school_id.name,
              }
            : null,
          preferred_language: updatedPreferredLanguage,
          status: selectedAccount.status,
        },
      },
    };
  }

  /**
   * Forgot password with multi-account support
   */
  async forgotPasswordMultiAccount(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    this.logger.log(`Forgot password request for: ${email}`);

    const encryptedEmail = this.emailEncryptionService.encryptEmail(email);

    // Find all active accounts with this email
    const accounts = await this.userModel
      .find({
        email: encryptedEmail,
        deleted_at: null,
        status: StatusEnum.ACTIVE,
      })
      .populate('role', 'name')
      .populate('school_id', 'name')
      .select('_id first_name last_name username account_code role school_id preferred_language')
      .lean();

    if (accounts.length === 0) {
      // Don't reveal if email exists or not (security)
      return {
        message: {
          en: 'If an account with that email exists, a password reset link has been sent.',
          fr: 'Si un compte avec cet email existe, un lien de réinitialisation a été envoyé.',
        },
      };
    }

    // If single account, send direct reset link
    if (accounts.length === 1) {
      const resetToken = this.jwtUtil.generateToken({
        id: accounts[0]._id.toString(),
        email: email,
        role_id: (accounts[0].role as any)._id.toString(),
        role_name: (accounts[0].role as any).name as RoleEnum,
        school_id: (accounts[0].school_id as any)?._id?.toString(),
      });

      const backendUrl = this.configService.get<string>('BACKEND_URL') || 'http://localhost:3000';
      const userLanguage = accounts[0].preferred_language || DEFAULT_LANGUAGE;
      const resetPasswordLink =
        userLanguage === LanguageEnum.FRENCH
          ? `${backendUrl}/static/reset-password-fr.html?token=${resetToken}`
          : `${backendUrl}/static/reset-password.html?token=${resetToken}`;

      await this.mailService.sendPasswordResetEmail(
        email,
        `${accounts[0].first_name} ${accounts[0].last_name}`,
        resetPasswordLink,
        accounts[0].preferred_language,
      );

      return {
        message: {
          en: 'Password reset link has been sent to your email.',
          fr: 'Un lien de réinitialisation du mot de passe a été envoyé à votre email.',
        },
      };
    }

    // Multiple accounts - return account selection required
    const accountList = accounts.map((account: any) => ({
      account_id: account._id.toString(),
      school_name: account.school_id?.name || 'N/A',
      role_name: account.role?.name || 'Unknown',
      username: account.username || null,
      account_code: account.account_code || null,
      first_name: account.first_name,
      last_name: account.last_name,
    }));

    return {
      requires_account_selection: true,
      accounts_count: accounts.length,
      accounts: accountList,
      message: {
        en: 'Multiple accounts found. Please select which account to reset.',
        fr: 'Plusieurs comptes trouvés. Veuillez sélectionner le compte à réinitialiser.',
      },
    };
  }

  /**
   * Reset password for specific account
   */
  async resetPasswordForAccount(
    accountId: string,
    newPassword: string,
    resetToken: string,
  ) {
    this.logger.log(`Password reset for account: ${accountId}`);

    try {
      // Verify reset token
      const decoded = this.jwtUtil.verifyToken(resetToken);
      if (decoded.id !== accountId) {
        throw new BadRequestException('Invalid reset token for this account');
      }

      // Hash new password
      const hashedPassword = await this.bcryptUtil.hashPassword(newPassword);

      // Update password
      await this.userModel.findByIdAndUpdate(accountId, {
        password: hashedPassword,
        updated_at: new Date(),
      });

      return {
        message: {
          en: 'Password reset successful. You can now login with your new password.',
          fr: 'Réinitialisation du mot de passe réussie. Vous pouvez maintenant vous connecter.',
        },
      };
    } catch (error) {
      this.logger.error('Error resetting password for account:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid or expired reset token');
    }
  }
}
