import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { config } from 'dotenv';
import { Role } from 'src/database/schemas/central/role.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { RoleEnum } from '../constants/roles.constant';
import {
  Student,
  StudentSchema,
} from 'src/database/schemas/tenant/student.schema';
import { TenantService } from 'src/modules/central/tenant.service';
import { JWTUserPayload } from '../types/jwr-user.type';
import { User } from 'src/database/schemas/central/user.schema';
import { School } from 'src/database/schemas/central/school.schema';
import { StatusEnum } from '../constants/status.constant';
import { DEFAULT_LANGUAGE } from '../constants/language.constant';
import { ErrorMessageService } from '../services/error-message.service';

export interface JWTPayload {
  id: string;
  email: string;
  school_id: string;
  role_id: string;
  role_name: string;
  token_type: 'access';
}

config();
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    @InjectModel(Role.name)
    private readonly roleModel: Model<Role>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantService: TenantService,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly errorMessageService: ErrorMessageService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  async validate(payload: JWTPayload): Promise<JWTUserPayload> {
    this.logger.debug(`Validating JWT payload for user: ${payload.email}`);
    try {
      // Validate token type
      if (payload.token_type !== 'access') {
        this.logger.warn(`Invalid token type for user ${payload.email}`);
        throw new UnauthorizedException(
          this.errorMessageService.getMessageWithLanguage(
            'AUTH',
            'INVALID_TOKEN_TYPE',
            DEFAULT_LANGUAGE,
          ),
        );
      }

      // Validate role exists
      const role = await this.roleModel.findById(
        new Types.ObjectId(payload.role_id),
      );
      if (!role || role.name !== payload.role_name) {
        this.logger.warn(
          `Invalid role information for user ${payload.email}: role not found or name mismatch`,
        );
        throw new UnauthorizedException(
          this.errorMessageService.getMessageWithLanguage(
            'AUTH',
            'INVALID_ROLE_INFORMATION',
            DEFAULT_LANGUAGE,
          ),
        );
      }

      // Check school status if user belongs to a school
      if (payload.school_id) {
        await this.validateSchoolStatus(payload.school_id, payload.email);
      }

      // If user is a student, validate in tenant database
      if (payload.role_name === RoleEnum.STUDENT) {
        const studentData = await this.validateStudentInTenant(payload);
        if (!studentData) {
          this.logger.warn(
            `Student ${payload.email} not found in tenant database for school: ${payload.school_id}`,
          );
          throw new UnauthorizedException(
            this.errorMessageService.getMessageWithLanguage(
              'STUDENT',
              'NOT_FOUND_IN_TENANT_DATABASE',
              DEFAULT_LANGUAGE,
            ),
          );
        }

        // Check student status
        if (studentData.status === StatusEnum.INACTIVE) {
          this.logger.warn(`Student ${payload.email} account is inactive`);
          throw new UnauthorizedException(
            this.errorMessageService.getMessageWithLanguage(
              'STUDENT',
              'ACCOUNT_DEACTIVATED',
              DEFAULT_LANGUAGE,
            ),
          );
        }

        this.logger.log(
          `Successfully validated student: ${payload.email} in school: ${payload.school_id}`,
        );
        return {
          id: payload.id,
          email: payload.email,
          school_id: payload.school_id,
          role: {
            id: payload.role_id,
            name: payload.role_name,
          },
          preferred_language:
            studentData.preferred_language || DEFAULT_LANGUAGE,
        };
      } else {
        // For other roles, validate in central userModel
        const user = await this.userModel.findOne({
          _id: new Types.ObjectId(payload.id),
          email: payload.email,
          role: new Types.ObjectId(payload.role_id),
        });

        if (!user) {
          this.logger.warn(
            `User ${payload.email} with role ${payload.role_name} not found in central users`,
          );
          throw new UnauthorizedException(
            this.errorMessageService.getMessageWithLanguage(
              'AUTH',
              'USER_NOT_FOUND_CENTRAL',
              DEFAULT_LANGUAGE,
            ),
          );
        }

        // Check if user is deleted
        if (user.deleted_at) {
          this.logger.warn(`User ${payload.email} account has been deleted`);
          throw new UnauthorizedException(
            this.errorMessageService.getMessageWithLanguage(
              'USER',
              'ACCOUNT_DELETED',
              DEFAULT_LANGUAGE,
            ),
          );
        }

        // Check user status
        if (user.status === StatusEnum.INACTIVE) {
          this.logger.warn(`User ${payload.email} account is inactive`);
          throw new UnauthorizedException(
            this.errorMessageService.getMessageWithLanguage(
              'USER',
              'ACCOUNT_DEACTIVATED',
              DEFAULT_LANGUAGE,
            ),
          );
        }

        this.logger.log(
          `Successfully validated user: ${payload.email} with role: ${payload.role_name}`,
        );
        return {
          id: user._id.toString(),
          email: user.email,
          school_id: user.school_id,
          role: {
            id: user.role.toString(),
            name: payload.role_name as RoleEnum,
          },
          preferred_language: user.preferred_language || DEFAULT_LANGUAGE,
        };
      }
    } catch (error) {
      this.logger.error(
        `Token validation failed for user ${payload.email}: ${error.message}`,
      );
      throw new UnauthorizedException(
        this.errorMessageService.getMessageWithParamsAndLanguage(
          'AUTH',
          'TOKEN_VALIDATION_FAILED',
          { error: error.message },
          DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  private async validateStudentInTenant(payload: JWTPayload) {
    try {
      // Get tenant db name
      const dbName = await this.tenantService.getTenantDbName(
        payload.school_id,
      );
      // Get tenant connection
      this.logger.debug(`Connecting to tenant database: ${dbName}`);
      const tenantConnection =
        await this.tenantConnectionService.getTenantConnection(dbName);

      // Find student in tenant database
      const StudentModel = tenantConnection.model(Student.name, StudentSchema);
      const student = await StudentModel.findOne({
        email: payload.email,
        school_id: new Types.ObjectId(payload.school_id),
      });
      if (!student) {
        this.logger.warn(
          `Student ${payload.email} not found in tenant database ${dbName}`,
        );
        return null;
      }

      this.logger.debug(
        `Student ${payload.email} found in tenant database ${dbName}`,
      );
      return {
        _id: student._id,
        email: student.email,
        school_id: student.school_id,
        status: student.status,
        preferred_language:
          (student as any).preferred_language || DEFAULT_LANGUAGE,
        role: {
          id: payload.role_id,
          name: payload.role_name as RoleEnum,
        },
      };
    } catch (error) {
      this.logger.error(
        `Student validation failed for ${payload.email}: ${error.message}`,
      );
      throw new UnauthorizedException(
        this.errorMessageService.getMessageWithParamsAndLanguage(
          'STUDENT',
          'VALIDATION_FAILED',
          { error: error.message },
          DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  private async validateSchoolStatus(
    schoolId: string,
    userEmail: string,
  ): Promise<void> {
    try {
      const school = await this.schoolModel.findById(
        new Types.ObjectId(schoolId),
      );

      if (!school) {
        this.logger.warn(`School not found for user ${userEmail}: ${schoolId}`);
        throw new UnauthorizedException(
          this.errorMessageService.getMessageWithLanguage(
            'SCHOOL',
            'NOT_FOUND',
            DEFAULT_LANGUAGE,
          ),
        );
      }

      if (school.status === StatusEnum.INACTIVE) {
        this.logger.warn(
          `School ${schoolId} is inactive for user ${userEmail}`,
        );
        throw new UnauthorizedException(
          this.errorMessageService.getMessageWithLanguage(
            'SCHOOL',
            'ACCOUNT_DEACTIVATED',
            DEFAULT_LANGUAGE,
          ),
        );
      }

      this.logger.debug(
        `School ${schoolId} status validated successfully for user ${userEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `School validation failed for ${userEmail}: ${error.message}`,
      );
      throw new UnauthorizedException(
        this.errorMessageService.getMessageWithParamsAndLanguage(
          'SCHOOL',
          'VALIDATION_FAILED',
          { error: error.message },
          DEFAULT_LANGUAGE,
        ),
      );
    }
  }
}
