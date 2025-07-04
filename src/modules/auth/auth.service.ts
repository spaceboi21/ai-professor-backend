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
import { School } from 'src/database/schemas/central/school.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly bcryptUtil: BcryptUtil,
    private readonly jwtUtil: JwtUtil,
  ) {}
  async superAdminLogin(loginData: LoginSuperAdminDto) {
    const { email, password } = loginData;
    const isSuperAdminExists = (await this.userModel
      .findOne({
        email,
        role: new Types.ObjectId(ROLE_IDS.SUPER_ADMIN),
      })
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
      last_loggedin: new Date(),
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
      last_loggedin: new Date(),
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
}
