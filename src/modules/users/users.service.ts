import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from 'src/database/schemas/central/user.schema';
import { StatusEnum } from 'src/common/constants/status.constant';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  getPaginationOptions,
  createPaginationResult,
} from 'src/common/utils/pagination.util';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  async getAllUsers(
    paginationDto: PaginationDto,
    search?: string,
    role?: string,
    status?: string,
  ) {
    this.logger.log('Getting all users with filters');

    const { page, limit } = getPaginationOptions(paginationDto);

    // Build filter query
    const filter: any = { deleted_at: null };

    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
      ];
    }

    if (role) {
      filter.role = new Types.ObjectId(role);
    }

    if (status) {
      filter.status = status;
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .populate('role', 'name')
        .populate('school_id', 'name')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.userModel.countDocuments(filter),
    ]);

    const pagination = createPaginationResult(users, total, {
      page,
      limit,
      skip: (page - 1) * limit,
    });

    return {
      message: 'Users retrieved successfully',
      ...pagination,
    };
  }

  async getUserById(id: Types.ObjectId) {
    this.logger.log(`Getting user by ID: ${id}`);

    const user = await this.userModel
      .findById(id)
      .populate('role', 'name')
      .populate('school_id', 'name')
      .lean();

    if (!user) {
      this.logger.warn(`User not found: ${id}`);
      throw new NotFoundException('User not found');
    }

    return {
      message: 'User retrieved successfully',
      data: user,
    };
  }

  async updateUserStatus(userId: string, status: StatusEnum) {
    this.logger.log(`Updating user status: ${userId} to ${status}`);

    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      this.logger.warn(`User not found: ${userId}`);
      throw new NotFoundException('User not found');
    }

    // Super admin cannot change their own status
    if (user.role.toString() === '6863cea411be9016b7ccb7fc') {
      // SUPER_ADMIN role ID
      throw new BadRequestException(
        'Super admin cannot change their own status',
      );
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, { status }, { new: true })
      .populate('role', 'name');

    if (!updatedUser) {
      throw new NotFoundException('User not found after update');
    }

    this.logger.log(`User status updated successfully: ${userId} to ${status}`);
    return {
      message: 'User status updated successfully',
      data: {
        id: updatedUser._id,
        email: updatedUser.email,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        status: updatedUser.status,
        role: updatedUser.role,
      },
    };
  }
}
