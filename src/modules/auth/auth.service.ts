import {
  BadRequestException,
  Injectable,
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

@Injectable()
export class AuthService {
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
      throw new NotFoundException('Super Admin does not exist');
    }

    const isPasswordMatch = await this.bcryptUtil.comparePassword(
      password,
      isSuperAdminExists.password,
    );

    if (!isPasswordMatch) {
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

    const user = (await this.userModel
      .findOne({
        email,
        role: new Types.ObjectId(ROLE_IDS.SCHOOL_ADMIN),
      })
      .select('+password')
      .populate({
        path: 'role',
        select: 'name',
      })) as (User & { role: Role }) | null;

    if (!user) {
      throw new NotFoundException('User not found with this email');
    }

    const isPasswordValid = await this.bcryptUtil.comparePassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Invalid credentials');
    }

    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found for this user');
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

    // First, find the student in the global students collection
    const globalStudent = await this.globalStudentModel.findOne({ email });

    if (!globalStudent) {
      throw new NotFoundException('Student not found with this email');
    }

    // Get the school information
    const school = await this.schoolModel.findById(globalStudent.school_id);
    if (!school) {
      throw new NotFoundException('School not found for this student');
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
      throw new NotFoundException('Student not found in school database');
    }

    // Verify password
    const isPasswordValid = await this.bcryptUtil.comparePassword(
      password,
      student.password,
    );

    if (!isPasswordValid) {
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
}
