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
import { ROLE_IDS, RoleEnum } from 'src/common/constants/roles.constant';
import {
  getPaginationOptions,
  createPaginationResult,
} from 'src/common/utils/pagination.util';
import { User } from 'src/database/schemas/central/user.schema';
import { ErrorMessageService } from 'src/common/services/error-message.service';
import { EmailEncryptionService } from 'src/common/services/email-encryption.service';
import { DEFAULT_LANGUAGE } from 'src/common/constants/language.constant';

@Injectable()
export class SchoolsService {
  private readonly logger = new Logger(SchoolsService.name);

  constructor(
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    private readonly errorMessageService: ErrorMessageService,
    private readonly emailEncryptionService: EmailEncryptionService,
  ) {}

  async getAllSchools(
    paginationDto: PaginationDto,
    search?: string,
    status?: string,
    user?: JWTUserPayload,
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

    // Decrypt school emails
    const decryptedSchools = schools.map((school) => {
      if (school.email) {
        school.email = this.emailEncryptionService.decryptEmail(school.email);
      }
      // Also decrypt created_by email if it exists and is populated
      if (
        school.created_by &&
        typeof school.created_by === 'object' &&
        'email' in school.created_by
      ) {
        (school.created_by as any).email =
          this.emailEncryptionService.decryptEmail(
            (school.created_by as any).email,
          );
      }
      return school;
    });

    const pagination = createPaginationResult(decryptedSchools, total, {
      page,
      limit,
      skip: (page - 1) * limit,
    });

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'SCHOOL',
        'SCHOOLS_RETRIEVED_SUCCESSFULLY',
        user?.preferred_language || DEFAULT_LANGUAGE,
      ),
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
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // School admin can only access their own school
    if (user.role.name === RoleEnum.SCHOOL_ADMIN) {
      if (school._id.toString() !== user.school_id?.toString()) {
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'SCHOOL',
            'ACCESS_OWN_ONLY',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
    }

    // find the super admin who is attached to this school
    const superAdmin = await this.userModel
      .findOne(
        {
          school_id: new Types.ObjectId(school._id.toString()),
          role: new Types.ObjectId(ROLE_IDS.SCHOOL_ADMIN),
        },
        {
          _id: 1,
          email: 1,
          first_name: 1,
          last_name: 1,
          created_at: 1,
          last_logged_in: 1,
          status: 1,
        },
      )
      .lean();

    // Decrypt school email
    if (school.email) {
      school.email = this.emailEncryptionService.decryptEmail(school.email);
    }

    // Decrypt created_by email if it exists and is populated
    if (
      school.created_by &&
      typeof school.created_by === 'object' &&
      'email' in school.created_by
    ) {
      (school.created_by as any).email =
        this.emailEncryptionService.decryptEmail(
          (school.created_by as any).email,
        );
    }

    // Decrypt super admin email if it exists
    let decryptedSuperAdmin = superAdmin;
    if (superAdmin && superAdmin.email) {
      decryptedSuperAdmin = {
        ...superAdmin,
        email: this.emailEncryptionService.decryptEmail(superAdmin.email),
      };
    }

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'SCHOOL',
        'RETRIEVED_SUCCESSFULLY',
        user?.preferred_language || DEFAULT_LANGUAGE,
      ),
      data: {
        ...school,
        super_admin: decryptedSuperAdmin,
      },
    };
  }

  async updateSchoolStatus(
    id: Types.ObjectId,
    status: StatusEnum,
    user?: JWTUserPayload,
  ) {
    this.logger.log(`Updating school status: ${id} to ${status}`);

    const school = await this.schoolModel.findById(id);
    if (!school) {
      this.logger.warn(`School not found: ${id}`);
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const updatedSchool = await this.schoolModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );

    if (!updatedSchool) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND_AFTER_UPDATE',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    this.logger.log(`School status updated successfully: ${id} to ${status}`);
    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'SCHOOL',
        'STATUS_UPDATED_SUCCESSFULLY',
        user?.preferred_language || DEFAULT_LANGUAGE,
      ),
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
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Authorization check - School admin can only update their own school
    if (user.role.name === RoleEnum.SCHOOL_ADMIN) {
      if (school._id.toString() !== user.school_id?.toString()) {
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'SCHOOL',
            'UNAUTHORIZED_UPDATE',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
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
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'SCHOOL',
          'DETAILS_UPDATED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
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
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'UPDATE_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }
}
