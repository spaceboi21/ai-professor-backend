import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
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
import { School } from 'src/database/schemas/central/school.schema';
import { GlobalStudent } from 'src/database/schemas/central/global-student.schema';
import {
  Student,
  StudentSchema,
} from 'src/database/schemas/tenant/student.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { StatusEnum } from 'src/common/constants/status.constant';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    @InjectModel(GlobalStudent.name)
    private readonly globalStudentModel: Model<GlobalStudent>,
    private readonly bcryptUtil: BcryptUtil,
    private readonly jwtUtil: JwtUtil,
    private readonly tenantConnectionService: TenantConnectionService,
  ) {}

  async superAdminLogin(loginData: LoginSuperAdminDto) {
    const { email, password } = loginData;
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
      throw new NotFoundException('Super Admin does not exist');
    }

    // Check user status
    if (isSuperAdminExists.status === StatusEnum.INACTIVE) {
      this.logger.warn(`Super Admin account is inactive: ${email}`);
      throw new BadRequestException(
        'Your account has been deactivated. Please contact support for assistance.',
      );
    }

    const isPasswordMatch = await this.bcryptUtil.comparePassword(
      password,
      isSuperAdminExists.password,
    );

    if (!isPasswordMatch) {
      this.logger.warn(`Invalid credentials for Super Admin: ${email}`);
      throw new BadRequestException('Invalid credentials');
    }

    const token = await this.jwtUtil.generateToken({
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
      message: 'Login successful',
      token,
      user: {
        email: isSuperAdminExists.email,
        first_name: isSuperAdminExists.first_name,
        last_name: isSuperAdminExists.last_name,
        role: isSuperAdminExists.role.toString(),
        _id: isSuperAdminExists._id.toString(),
      },
    };
  }

  async schoolAdminLogin(loginSchoolAdminDto: LoginSchoolAdminDto) {
    const { email, password } = loginSchoolAdminDto;
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
      throw new NotFoundException('User not found with this email');
    }

    // Check user status
    if (user.status === StatusEnum.INACTIVE) {
      this.logger.warn(`School Admin account is inactive: ${email}`);
      throw new BadRequestException(
        'Your account has been deactivated. Please contact support for assistance.',
      );
    }

    const isPasswordValid = await this.bcryptUtil.comparePassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      this.logger.warn(`Invalid credentials for School Admin: ${email}`);
      throw new BadRequestException('Invalid credentials');
    }

    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      this.logger.warn(`School not found for School Admin: ${email}`);
      throw new NotFoundException('School not found for this user');
    }

    // Check school status
    if (school.status === StatusEnum.INACTIVE) {
      this.logger.warn(`School is inactive for School Admin: ${email}`);
      throw new BadRequestException(
        'Your school has been deactivated. Please contact support for assistance.',
      );
    }

    const token = this.jwtUtil.generateToken({
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
      message: 'Login successful',
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        school_id: school._id.toString(),
        role: user.role._id.toString(),
      },
    };
  }

  async studentLogin(loginStudentDto: LoginStudentDto) {
    const { email, password } = loginStudentDto;
    this.logger.log(`Student login attempt: ${email}`);
    // First, find the student in the global students collection
    const globalStudent = await this.globalStudentModel.findOne({ email });

    if (!globalStudent) {
      this.logger.warn(`Global student not found: ${email}`);
      throw new NotFoundException('Student not found with this email');
    }

    // Get the school information
    const school = await this.schoolModel.findById(globalStudent.school_id);
    if (!school) {
      this.logger.warn(`School not found for student: ${email}`);
      throw new NotFoundException('School not found for this student');
    }

    // Check school status
    if (school.status === StatusEnum.INACTIVE) {
      this.logger.warn(`School is inactive for student: ${email}`);
      throw new BadRequestException(
        'Your school has been deactivated. Please contact support for assistance.',
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
      throw new NotFoundException('Student not found in school database');
    }

    // Check student status
    if (student.status === StatusEnum.INACTIVE) {
      this.logger.warn(`Student account is inactive: ${email}`);
      throw new BadRequestException(
        'Your account has been deactivated. Please contact support for assistance.',
      );
    }

    // Verify password
    const isPasswordValid = await this.bcryptUtil.comparePassword(
      password,
      student.password,
    );

    if (!isPasswordValid) {
      this.logger.warn(`Invalid credentials for Student: ${email}`);
      throw new BadRequestException('Invalid credentials');
    }

    // Generate JWT token
    const token = this.jwtUtil.generateToken({
      id: student._id.toString(),
      email: student.email,
      role_id: ROLE_IDS.STUDENT,
      school_id: school._id.toString(),
      role_name: RoleEnum.STUDENT,
    });

    // Update last login time
    await StudentModel.findByIdAndUpdate(student._id, {
      last_logged_in: new Date(),
    });

    this.logger.log(`Student login successful: ${email}`);
    return {
      message: 'Login successful',
      token,
      user: {
        id: student._id,
        email: student.email,
        first_name: student.first_name,
        last_name: student.last_name,
        student_code: student.student_code,
        school_id: school._id.toString(),
        role: ROLE_IDS.STUDENT,
      },
    };
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
        throw new NotFoundException('School not found');
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
        throw new NotFoundException('Student not found');
      }

      return {
        ...student,
        role: user.role, // role from JWT (already populated)
      };
    } else {
      // Get user details from central DB
      const dbUser = await this.userModel
        .findOne({
          _id: user.id,
          role: new Types.ObjectId(user.role.id),
        })
        .lean();

      if (!dbUser) {
        this.logger.warn(`User not found in getMe: ${user.id}`);
        throw new NotFoundException('User not found');
      }

      return {
        ...dbUser,
        role: user.role, // populated role object
      };
    }
  }
}
