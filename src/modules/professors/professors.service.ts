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
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { ROLE_IDS } from 'src/common/constants/roles.constant';
import {
  getPaginationOptions,
  createPaginationResult,
} from 'src/common/utils/pagination.util';

@Injectable()
export class ProfessorsService {
  private readonly logger = new Logger(ProfessorsService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  async getAllProfessors(
    paginationDto: PaginationDto,
    user: JWTUserPayload,
    search?: string,
    status?: string,
  ) {
    this.logger.log('Getting all professors with filters');

    const { page, limit } = getPaginationOptions(paginationDto);

    // Build filter query
    const filter: any = {
      deleted_at: null,
      role: new Types.ObjectId(ROLE_IDS.PROFESSOR),
      school_id: user?.school_id ? new Types.ObjectId(user.school_id) : null,
    };

    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      filter.status = status;
    }

    const [professors, total] = await Promise.all([
      this.userModel
        .find(filter)
        .populate('role', 'name')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.userModel.countDocuments(filter),
    ]);

    const pagination = createPaginationResult(professors, total, {
      page,
      limit,
      skip: (page - 1) * limit,
    });

    return {
      message: 'Professors retrieved successfully',
      ...pagination,
    };
  }

  async getProfessorById(id: Types.ObjectId, user: JWTUserPayload) {
    this.logger.log(`Getting professor by ID: ${id}`);

    const professor = await this.userModel
      .findOne({
        _id: id,
        deleted_at: null,
        role: new Types.ObjectId(ROLE_IDS.PROFESSOR),
        school_id: user?.school_id ? new Types.ObjectId(user.school_id) : null,
      })
      .populate('role', 'name')
      .lean();

    if (!professor) {
      this.logger.warn(`Professor not found: ${id}`);
      throw new NotFoundException('Professor not found');
    }

    return {
      message: 'Professor retrieved successfully',
      data: professor,
    };
  }

  async updateProfessorStatus(
    professorId: string,
    status: StatusEnum,
    user: JWTUserPayload,
  ) {
    this.logger.log(
      `School admin updating professor status: ${professorId} to ${status}`,
    );

    if (!Types.ObjectId.isValid(professorId)) {
      throw new BadRequestException('Invalid professor ID');
    }

    // Find professor in central users table
    const professor = await this.userModel.findOne({
      _id: new Types.ObjectId(professorId),
      role: new Types.ObjectId(ROLE_IDS.PROFESSOR),
      school_id: user?.school_id ? new Types.ObjectId(user.school_id) : null,
    });

    if (!professor) {
      throw new NotFoundException('Professor not found or not in your school');
    }

    const updatedProfessor = await this.userModel
      .findByIdAndUpdate(professorId, { status }, { new: true })
      .populate('role', 'name');

    if (!updatedProfessor) {
      throw new NotFoundException('Professor not found after update');
    }

    this.logger.log(
      `Professor status updated successfully: ${professorId} to ${status}`,
    );
    return {
      message: 'Professor status updated successfully',
      data: {
        id: updatedProfessor._id,
        email: updatedProfessor.email,
        first_name: updatedProfessor.first_name,
        last_name: updatedProfessor.last_name,
        status: updatedProfessor.status,
        role: updatedProfessor.role,
      },
    };
  }
}
