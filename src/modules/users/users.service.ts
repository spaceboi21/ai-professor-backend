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
import { ROLE_IDS } from 'src/common/constants/roles.constant';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  getPaginationOptions,
  createPaginationResult,
} from 'src/common/utils/pagination.util';
import { ErrorMessageService } from 'src/common/services/error-message.service';
import { DEFAULT_LANGUAGE } from 'src/common/constants/language.constant';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    private readonly errorMessageService: ErrorMessageService,
  ) {}

  async getAllUsers(
    paginationDto: PaginationDto,
    search?: string,
    role?: string,
    status?: string,
    user?: JWTUserPayload,
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
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'USER',
        'USERS_RETRIEVED_SUCCESSFULLY',
        user?.preferred_language || DEFAULT_LANGUAGE,
      ),
      ...pagination,
    };
  }

  async getUserById(id: Types.ObjectId, user?: JWTUserPayload) {
    this.logger.log(`Getting user by ID: ${id}`);

    const foundUser = await this.userModel
      .findById(id)
      .populate('role', 'name')
      .populate('school_id', 'name')
      .lean();

    if (!foundUser) {
      this.logger.warn(`User not found: ${id}`);
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'USER',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'USER',
        'RETRIEVED_SUCCESSFULLY',
        user?.preferred_language || DEFAULT_LANGUAGE,
      ),
      data: foundUser,
    };
  }

  async updateUserStatus(
    id: Types.ObjectId,
    status: StatusEnum,
    user?: JWTUserPayload,
  ) {
    this.logger.log(`Updating user status: ${id} to ${status}`);

    const foundUser = await this.userModel.findById(id);
    if (!foundUser) {
      this.logger.warn(`User not found: ${id}`);
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'USER',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Super admin cannot change their own status
    if (foundUser.role.toString() === ROLE_IDS.SUPER_ADMIN) {
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'USER',
          'SUPER_ADMIN_STATUS_CHANGE_FORBIDDEN',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .populate('role', 'name');

    if (!updatedUser) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'USER',
          'NOT_FOUND_AFTER_UPDATE',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    this.logger.log(`User status updated successfully: ${id} to ${status}`);
    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'USER',
        'STATUS_UPDATED_SUCCESSFULLY',
        user?.preferred_language || DEFAULT_LANGUAGE,
      ),
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
