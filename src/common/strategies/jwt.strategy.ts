import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { config } from 'dotenv';
import { Role } from 'src/database/schemas/central/role.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { RoleEnum } from '../constants/roles.constant';
import { Student } from 'src/database/schemas/tenant/student.schema';
import { TenantService } from 'src/modules/central/tenant.service';

export interface JWTPayload {
  id: string;
  email: string;
  school_id: string;
  role_id: string;
  role_name: string;
}

config();
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    @InjectModel(Role.name)
    private readonly roleModel: Model<Role>,
    private readonly tenantService: TenantService,
    private readonly tenantConnectionService: TenantConnectionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  async validate(payload: JWTPayload) {
    this.logger.debug(`Validating JWT payload for user: ${payload.email}`);

    try {
      // Validate role exists
      const role = await this.roleModel.findById(payload.role_id);
      if (!role || role.name !== payload.role_name) {
        this.logger.warn(
          `Invalid role information for user ${payload.email}: role not found or name mismatch`,
        );
        throw new UnauthorizedException('Invalid role information');
      }

      // If user is a student, validate in tenant database
      if (payload.role_name === RoleEnum.STUDENT) {
        const studentData = await this.validateStudentInTenant(payload);
        if (!studentData) {
          this.logger.warn(
            `Student ${payload.email} not found in tenant database for school: ${payload.school_id}`,
          );
          throw new UnauthorizedException(
            'Student not found in tenant database',
          );
        }

        this.logger.log(
          `Successfully validated student: ${payload.email} in school: ${payload.school_id}`,
        );
        return {
          userId: payload.id,
          email: payload.email,
          school_id: payload.school_id,
          role: {
            id: payload.role_id,
            name: payload.role_name,
          },
          studentData, // Include student details for student users
        };
      }

      // For non-student roles, return basic user info
      this.logger.log(
        `Successfully validated user: ${payload.email} with role: ${payload.role_name}`,
      );
      return {
        userId: payload.id,
        email: payload.email,
        school_id: payload.school_id,
        role: {
          id: payload.role_id,
          name: payload.role_name,
        },
      };
    } catch (error) {
      this.logger.error(
        `Token validation failed for user ${payload.email}: ${error.message}`,
      );
      throw new UnauthorizedException(
        `Token validation failed: ${error.message}`,
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

      const studentModel = tenantConnection.collection(Student.name);
      const student = await studentModel.findOne({
        email: payload.email,
        school_id: payload.school_id,
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
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        school_id: student.school_id,
        student_id: student.student_id,
        profile_pic: student.profile_pic,
      };
    } catch (error) {
      this.logger.error(
        `Student validation failed for ${payload.email}: ${error.message}`,
      );
      throw new UnauthorizedException(
        `Student validation failed: ${error.message}`,
      );
    }
  }
}
