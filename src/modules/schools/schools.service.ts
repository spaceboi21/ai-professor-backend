import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { School } from 'src/database/schemas/central/school.schema';
import { StatusEnum } from 'src/common/constants/status.constant';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { UpdateSchoolDetailsDto } from 'src/modules/school-admin/dto/update-school-details.dto';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { RoleEnum } from 'src/common/constants/roles.constant';
import {
  getPaginationOptions,
  createPaginationResult,
} from 'src/common/utils/pagination.util';

@Injectable()
export class SchoolsService {
  private readonly logger = new Logger(SchoolsService.name);

  constructor(
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
  ) {}

  async getAllSchools(
    paginationDto: PaginationDto,
    search?: string,
    status?: string,
  ) {
    this.logger.log('Getting all schools with filters');

    const { page, limit } = getPaginationOptions(paginationDto);

    // Build filter query
    const filter: any = { deleted_at: null };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      filter.status = status;
    }

    const [schools, total] = await Promise.all([
      this.schoolModel
        .find(filter)
        .populate('created_by', 'first_name last_name email')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.schoolModel.countDocuments(filter),
    ]);

    const pagination = createPaginationResult(schools, total, {
      page,
      limit,
      skip: (page - 1) * limit,
    });

    return {
      message: 'Schools retrieved successfully',
      ...pagination,
    };
  }

  async getSchoolById(id: Types.ObjectId, user: JWTUserPayload) {
    this.logger.log(`Getting school by ID: ${id}`);

    const school = await this.schoolModel
      .findById(id)
      .populate('created_by', 'first_name last_name email')
      .lean();

    if (!school) {
      this.logger.warn(`School not found: ${id}`);
      throw new NotFoundException('School not found');
    }

    // School admin can only access their own school
    if (user.role.name === RoleEnum.SCHOOL_ADMIN) {
      if (school._id.toString() !== user.school_id) {
        throw new BadRequestException('You can only access your own school');
      }
    }

    return {
      message: 'School retrieved successfully',
      data: school,
    };
  }

  async updateSchoolStatus(id: Types.ObjectId, status: StatusEnum) {
    this.logger.log(`Updating school status: ${id} to ${status}`);

    const school = await this.schoolModel.findById(id);
    if (!school) {
      this.logger.warn(`School not found: ${id}`);
      throw new NotFoundException('School not found');
    }

    const updatedSchool = await this.schoolModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );

    if (!updatedSchool) {
      throw new NotFoundException('School not found after update');
    }

    this.logger.log(`School status updated successfully: ${id} to ${status}`);
    return {
      message: 'School status updated successfully',
      data: {
        id: updatedSchool._id,
        name: updatedSchool.name,
        email: updatedSchool.email,
        status: updatedSchool.status,
      },
    };
  }

  async updateSchoolDetails(
    id: Types.ObjectId,
    updateSchoolDetailsDto: UpdateSchoolDetailsDto,
    user: JWTUserPayload,
  ) {
    this.logger.log(`Updating school details: ${id}`);

    const school = await this.schoolModel.findById(id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Authorization check - School admin can only update their own school
    if (user.role.name === RoleEnum.SCHOOL_ADMIN) {
      if (school._id.toString() !== user.school_id) {
        throw new BadRequestException(
          'You are not authorized to update this school',
        );
      }
    }

    // Destructure all possible fields
    const {
      school_name,
      address,
      school_website_url,
      phone,
      country_code,
      timezone,
      language,
      logo,
    } = updateSchoolDetailsDto || {};

    // Update fields conditionally
    if (school_name) {
      school.name = school_name;
    }
    if (address) {
      school.address = address;
    }
    if (school_website_url) {
      school.website_url = school_website_url;
    }
    if (phone) {
      school.phone = phone;
    }
    if (country_code) {
      school.country_code = country_code;
    }
    if (timezone) {
      school.timezone = timezone;
    }
    if (language) {
      school.language = language;
    }
    if (logo) {
      school.logo = logo;
    }

    school.updated_by = new Types.ObjectId(user.id);

    try {
      const updatedSchool = await school.save();
      return {
        message: 'School details updated successfully',
        data: {
          _id: updatedSchool._id,
          school_name: updatedSchool.name,
          address: updatedSchool.address,
          school_website_url: updatedSchool.website_url,
          phone: updatedSchool.phone,
          country_code: updatedSchool.country_code,
          timezone: updatedSchool.timezone,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error updating school details for school ID: ${id}`,
        error?.stack || error,
      );
      throw new BadRequestException('Failed to update school details');
    }
  }
}
