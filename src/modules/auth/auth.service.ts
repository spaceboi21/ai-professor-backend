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
    private readonly bcryptUtil: BcryptUtil,
    private readonly jwtUtil: JwtUtil,
    private readonly tokenUtil: TokenUtil,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly errorMessageService: ErrorMessageService,
  ) {}

  async superAdminLogin(loginData: LoginSuperAdminDto, req: Request) {
    const { email, password, rememberMe } = loginData;
    this.logger.log(`SuperAdmin login attempt: ${email}`);

    const isSuperAdminExists = (await this.userModel
      .findOne({
        email,
        role: new Types.ObjectId(ROLE_IDS.SUPER_ADMIN),
      })
      .select('+password')
      .populate({
        path: 'role',
        select: 'name',
      })) as (User & { role: Role }) | null;

    if (!isSuperAdminExists) {
      this.logger.warn(`Super Admin not found: ${email}`);
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'USER',
          'NOT_FOUND',
          DEFAULT_LANGUAGE,
        ),
      );
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
          isSuperAdminExists.preferred_language || DEFAULT_LANGUAGE,
        ),
        error: 'Invalid Credentials',
        statusCode: 400,
      });
    }

    const tokenPair = this.tokenUtil.generateTokenPair({
      email: isSuperAdminExists.email,
      id: isSuperAdminExists._id.toString(),
      role_id: isSuperAdminExists.role._id.toString(),
      role_name: isSuperAdminExists.role.name as RoleEnum,
      school_id: isSuperAdminExists.school_id?.toString(),
    });

    await this.userModel.findByIdAndUpdate(isSuperAdminExists._id, {
      last_logged_in: new Date(),
    });

    this.logger.log(`SuperAdmin login successful: ${email}`);
    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'AUTH',
        'LOGIN_SUCCESSFUL',
        isSuperAdminExists?.preferred_language || DEFAULT_LANGUAGE,
      ),
      ...tokenPair,
      user: {
        email: isSuperAdminExists.email,
        first_name: isSuperAdminExists.first_name,
        last_name: isSuperAdminExists.last_name,
        role: isSuperAdminExists.role.toString(),
        _id: isSuperAdminExists._id.toString(),
        preferred_language:
          isSuperAdminExists.preferred_language || DEFAULT_LANGUAGE,
      },
    };
  }

  async schoolAdminLogin(
    loginSchoolAdminDto: LoginSchoolAdminDto,
    req: Request,
  ) {
    const { email, password, rememberMe } = loginSchoolAdminDto;
    this.logger.log(`SchoolAdmin login attempt: ${email}`);

    const user = (await this.userModel
      .findOne({
        email,
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
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'USER',
          'NOT_FOUND_WITH_EMAIL',
          DEFAULT_LANGUAGE,
        ),
      );
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
          user.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const tokenPair = this.tokenUtil.generateTokenPair({
      id: user._id.toString(),
      email: user.email,
      role_id: user.role._id.toString(),
      school_id: school._id.toString(),
      role_name: user.role.name as RoleEnum,
    });

    await this.userModel.findByIdAndUpdate(user._id, {
      last_logged_in: new Date(),
    });

    this.logger.log(`SchoolAdmin login successful: ${email}`);
    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'AUTH',
        'LOGIN_SUCCESSFUL',
        user?.preferred_language || DEFAULT_LANGUAGE,
      ),
      ...tokenPair,
      user: {
        id: user._id.toString(),
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        school_id: school._id.toString(),
        role: user.role._id.toString(),
        role_name: user.role.name as RoleEnum,
        preferred_language: user.preferred_language || DEFAULT_LANGUAGE,
      },
    };
  }

  async studentLogin(loginStudentDto: LoginStudentDto, req: Request) {
    const { email, password, rememberMe } = loginStudentDto;
    this.logger.log(`Student login attempt: ${email}`);

    // First, find the student in the global students collection
    const globalStudent = await this.globalStudentModel.findOne({ email });

    if (!globalStudent) {
      this.logger.warn(`Global student not found: ${email}`);
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'NOT_FOUND_WITH_EMAIL',
          DEFAULT_LANGUAGE,
        ),
      );
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
      email,
      deleted_at: null,
    }).select('+password');

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
          student.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const tokenPair = this.tokenUtil.generateTokenPair({
      id: student._id.toString(),
      email: student.email,
      role_id: ROLE_IDS.STUDENT,
      school_id: school._id.toString(),
      role_name: RoleEnum.STUDENT,
    });

    await StudentModel.findByIdAndUpdate(student._id, {
      last_logged_in: new Date(),
    });

    // Get preferred language from student data
    const preferredLanguage = student.preferred_language || DEFAULT_LANGUAGE;

    this.logger.log(`Student login successful: ${email}`);
    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'AUTH',
        'LOGIN_SUCCESSFUL',
        preferredLanguage,
      ),
      ...tokenPair,
      user: {
        id: student._id,
        email: student.email,
        first_name: student.first_name,
        last_name: student.last_name,
        student_code: student.student_code,
        school_id: school._id.toString(),
        role: ROLE_IDS.STUDENT,
        preferred_language: preferredLanguage,
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

      return {
        ...student,
        role: user.role, // role from JWT (already populated)
        preferred_language: student.preferred_language || DEFAULT_LANGUAGE,
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

      return {
        ...userData,
        role: user.role, // role from JWT (already populated)
        preferred_language: userData.preferred_language || DEFAULT_LANGUAGE,
      };
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    this.logger.log(`Forgot password request for email: ${email}`);

    // First, check if email exists in school admin/professor users
    const schoolUser = await this.userModel
      .findOne({
        email,
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
      // Handle school admin/professor forgot password
      return this.handleSchoolUserForgotPassword(schoolUser);
    }

    // If not found in school users, check if it's a student
    const globalStudent = await this.globalStudentModel.findOne({ email });
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
      email,
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

    // Create reset password link - serve from backend
    const backendUrl =
      this.configService.get<string>('BACKEND_URL') || 'http://localhost:3000';
    const resetPasswordLink = `${backendUrl}/static/reset-password.html?token=${resetToken}`;

    // Send email
    try {
      await this.mailService.sendPasswordResetEmail(
        user.email,
        `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}`,
        resetPasswordLink,
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

    // Create reset password link - serve from backend
    const backendUrl =
      this.configService.get<string>('BACKEND_URL') || 'http://localhost:3000';
    const resetPasswordLink = `${backendUrl}/static/reset-password.html?token=${resetToken}`;

    // Send email
    try {
      await this.mailService.sendPasswordResetEmail(
        student.email,
        `${student.first_name}${student.last_name ? ` ${student.last_name}` : ''}`,
        resetPasswordLink,
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
    const { token, new_password } = setNewPasswordDto;
    this.logger.log('Setting new password with token');

    try {
      // Verify the token
      const payload = this.jwtUtil.verifyToken(token);

      // Check if it's a student or school user based on role
      if (payload.role_name === RoleEnum.STUDENT) {
        return this.handleStudentPasswordReset(payload, new_password);
      } else {
        return this.handleSchoolUserPasswordReset(payload, new_password);
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

    // Hash the new password
    const hashedPassword = await this.bcryptUtil.hashPassword(new_password);

    // Update the password
    user.password = hashedPassword;
    user.last_logged_in = new Date();

    await user.save();

    this.logger.log(
      `Password updated successfully for school user: ${user.email}`,
    );

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'AUTH',
        'PASSWORD_UPDATED_SUCCESSFULLY',
        user?.preferred_language || DEFAULT_LANGUAGE,
      ),
      data: {
        id: user._id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
      },
    };
  }

  private async handleStudentPasswordReset(payload: any, new_password: string) {
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

    // Hash the new password
    const hashedPassword = await this.bcryptUtil.hashPassword(new_password);

    // Update the password
    student.password = hashedPassword;
    student.last_logged_in = new Date();

    await student.save();

    this.logger.log(
      `Password updated successfully for student: ${student.email}`,
    );

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'AUTH',
        'PASSWORD_UPDATED_SUCCESSFULLY',
        student?.preferred_language || DEFAULT_LANGUAGE,
      ),
      data: {
        id: student._id,
        email: student.email,
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
        message: 'Preferred language updated successfully',
        data: {
          user_id: updatedUser._id,
          preferred_language: updatedUser.preferred_language,
          updated_at: updatedUser.updated_at,
        },
      };
    }
  }
}
