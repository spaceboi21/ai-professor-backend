import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ROLE_IDS, RoleEnum } from 'src/common/constants/roles.constant';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import {
  BcryptUtil,
  createPaginationResult,
  getPaginationOptions,
} from 'src/common/utils';
import { GlobalStudent } from 'src/database/schemas/central/global-student.schema';
import { School } from 'src/database/schemas/central/school.schema';
import { User } from 'src/database/schemas/central/user.schema';
import { MailService } from 'src/mail/mail.service';
import { CreateProfessorDto } from './dto/create-professor.dto';
import {
  UpdateProfessorDto,
  UpdateProfessorPasswordDto,
} from './dto/update-professor.dto';
import { StatusEnum } from 'src/common/constants/status.constant';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class ProfessorService {
  private readonly logger = new Logger(ProfessorService.name);
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    @InjectModel(GlobalStudent.name)
    private readonly globalStudentModel: Model<GlobalStudent>,
    private readonly bcryptUtil: BcryptUtil,
    private readonly mailService: MailService,
  ) {}

  async createProfessor(
    createProfessorDto: CreateProfessorDto,
    adminUser: JWTUserPayload,
  ) {
    const { first_name, last_name, email, school_id, status } = createProfessorDto;

    this.logger.log(
      `Creating professor with email: ${email} for school: ${school_id}`,
    );
    // Validate school exists and admin has access
    const school = await this.schoolModel.findById(
      new Types.ObjectId(school_id),
    );
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // If admin is SCHOOL_ADMIN, ensure they belong to this school
    if (adminUser.role.name === RoleEnum.SCHOOL_ADMIN) {
      if (adminUser.school_id?.toString() !== school_id) {
        throw new BadRequestException(
          'You can only create professor for your own school',
        );
      }
    }

    // Check if email already exists in central users
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('Email already exists in the system');
    }

    // Check if email already exists in global professors
    const existingGlobalStudent = await this.globalStudentModel.findOne({
      email,
    });
    if (existingGlobalStudent) {
      throw new ConflictException('Email already exists');
    }

    // Generate a random password
    const generatedPassword = this.bcryptUtil.generateStrongPassword();
    const hashedPassword =
      await this.bcryptUtil.hashPassword(generatedPassword);

    try {
      // Create professors in user table
      const newStudent = await this.userModel.create({
        first_name,
        last_name,
        email,
        password: hashedPassword,
        school_id: new Types.ObjectId(school_id),
        status: status || StatusEnum.ACTIVE, // Use provided status or default to ACTIVE
        created_by: new Types.ObjectId(adminUser?.id),
        created_by_role: adminUser.role.name as RoleEnum,
        role: new Types.ObjectId(ROLE_IDS[RoleEnum.PROFESSOR]),
      });

      this.logger.log(`Professor created in user table: ${newStudent._id}`);

      // Send credentials email
      await this.mailService.sendCredentialsEmail(
        email,
        `${first_name}${last_name ? ` ${last_name}` : ''}`,
        generatedPassword,
        RoleEnum.PROFESSOR,
      );

      this.logger.log(`Credentials email sent to: ${email}`);

      return {
        message: 'Professor created successfully',
        data: {
          id: newStudent._id,
          first_name: newStudent.first_name,
          last_name: newStudent.last_name,
          email: newStudent.email,
          school_id: newStudent.school_id,
          status: newStudent.status,
          created_at: newStudent.created_at,
        },
      };
    } catch (error) {
      this.logger.error('Error creating Professor', error?.stack || error);

      throw new BadRequestException('Failed to create Professor');
    }
  }

  async updateProfessor(id: Types.ObjectId, data: UpdateProfessorDto) {
    // Find the professor by ID
    const professor = await this.userModel.findOne({
      _id: id,
      deleted_at: null, // Exclude deleted professors
    });
    if (!professor) {
      throw new NotFoundException('Professor not found');
    }

    // Update fields if provided
    if (data.first_name) {
      professor.first_name = data.first_name;
    }
    if (data.last_name) {
      professor.last_name = data.last_name;
    }
    if (data.phone) {
      professor.phone = data.phone;
    }
    if (data.country_code) {
      professor.country_code = data.country_code;
    }
    if (data.profile_pic) {
      professor.profile_pic = data.profile_pic;
    }
    if (data.status) {
      professor.status = data.status;
    }

    // email is not allowed to be updated

    // if (data.email) {
    //   // Check if email already exists in central users
    //   const existingUser = await this.userModel.find
    //     .findOne({ email: data.email })
    //     .where('_id')
    //     .ne(id);
    //   if (existingUser) {
    //     throw new ConflictException('Email already exists in the system');
    //   }
    //   // Check if email already exists in global professors
    //   const existingGlobalStudent = await this.globalStudentModel
    //     .findOne({ email: data.email })
    //     .where('_id')
    //     .ne(id);
    //   if (existingGlobalStudent) {
    //     throw new ConflictException('Email already exists');
    //   }
    //   professor.email = data.email.toLowerCase();
    // }

    // Save the updated professor
    try {
      const updatedProfessor = await professor.save();
      return {
        message: 'Professor updated successfully',
        data: {
          id: updatedProfessor._id,
          first_name: updatedProfessor.first_name,
          last_name: updatedProfessor.last_name,
          email: updatedProfessor.email,
          phone: updatedProfessor.phone,
          country_code: updatedProfessor.country_code,
          school_id: updatedProfessor.school_id,
          created_at: updatedProfessor.created_at,
        },
      };
    } catch (error) {
      console.error('Error updating Professor:', error);
      if (error?.code === 11000) {
        throw new ConflictException('Email already exists');
      }
      throw new BadRequestException('Failed to update Professor');
    }
  }

  async updateProfessorPassword(
    id: Types.ObjectId,
    data: UpdateProfessorPasswordDto,
  ) {
    // Find the professor by ID
    const professor = await this.userModel.findOne({
      _id: id,
      deleted_at: null, // Exclude deleted professors
    });
    if (!professor) {
      throw new NotFoundException('Professor not found');
    }
    // Validate old password
    const isPasswordValid = await this.bcryptUtil.comparePassword(
      data.old_password,
      professor.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Invalid old password');
    }

    // Hash the new password
    const hashedNewPassword = await this.bcryptUtil.hashPassword(
      data.new_password,
    );
    // Update the password
    professor.password = hashedNewPassword;
    professor.last_logged_in = new Date(); // Update last logged in time
    try {
      const updatedProfessor = await professor.save();
      return {
        message: 'Password updated successfully',
        data: {
          id: updatedProfessor._id,
          first_name: updatedProfessor.first_name,
          last_name: updatedProfessor.last_name,
          email: updatedProfessor.email,
          phone: updatedProfessor.phone,
          country_code: updatedProfessor.country_code,
          school_id: updatedProfessor.school_id,
          created_at: updatedProfessor.created_at,
        },
      };
    } catch (error) {
      console.error('Error updating Professor password:', error);
      throw new BadRequestException('Failed to update Professor password');
    }
  }

  async getAllProfessors(
    paginationDto: PaginationDto,
    user: JWTUserPayload,
    search?: string,
    status?: string,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
  ) {
    this.logger.log('Getting all professors with filters');

    const { page, limit } = getPaginationOptions(paginationDto);

    // Build filter query
    const filter: any = {
      deleted_at: null, // Exclude deleted professors
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

    // Build sort object
    const sort: any = {};
    if (sortBy) {
      const order = sortOrder === 'desc' ? -1 : 1;
      sort[sortBy] = order;
    } else {
      // Default sorting by created_at descending (newest first)
      sort.created_at = -1;
    }

    const [professors, total] = await Promise.all([
      this.userModel.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'roles',
            localField: 'role',
            foreignField: '_id',
            as: 'roleData',
          },
        },
        {
          $addFields: {
            name: {
              $concat: [
                '$first_name',
                {
                  $cond: {
                    if: '$last_name',
                    then: { $concat: [' ', '$last_name'] },
                    else: '',
                  },
                },
              ],
            },
            role: { $arrayElemAt: ['$roleData', 0] },
          },
        },
        { $unset: 'roleData' },
        { $sort: sort },
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ]),
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
        deleted_at: null, // Exclude deleted professors
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
    id: Types.ObjectId,
    status: StatusEnum,
    user: JWTUserPayload,
  ) {
    this.logger.log(
      `School admin updating professor status: ${id} to ${status}`,
    );

    // Find professor in central users table
    const professor = await this.userModel.findOne({
      _id: id,
      deleted_at: null, // Exclude deleted professors
      role: new Types.ObjectId(ROLE_IDS.PROFESSOR),
      school_id: user?.school_id ? new Types.ObjectId(user.school_id) : null,
    });

    if (!professor) {
      throw new NotFoundException('Professor not found or not in your school');
    }

    const updatedProfessor = await this.userModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .populate('role', 'name');

    if (!updatedProfessor) {
      throw new NotFoundException('Professor not found after update');
    }

    this.logger.log(
      `Professor status updated successfully: ${id} to ${status}`,
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

  async deleteProfessor(id: Types.ObjectId, user: JWTUserPayload) {
    this.logger.log(`Soft deleting professor: ${id}`);

    // Find professor in central users table
    const professor = await this.userModel.findOne({
      _id: new Types.ObjectId(id),
      role: new Types.ObjectId(ROLE_IDS.PROFESSOR),
      deleted_at: null, // Only find non-deleted professors
    });

    if (!professor) {
      throw new NotFoundException('Professor not found');
    }

    // If user is SCHOOL_ADMIN, ensure they can only delete professors from their school
    if (user.role.name === RoleEnum.SCHOOL_ADMIN) {
      if (user.school_id?.toString() !== professor.school_id?.toString()) {
        throw new BadRequestException(
          'You can only delete professors from your own school',
        );
      }
    }

    // Check if professor is already deleted
    if (professor.deleted_at) {
      throw new BadRequestException('Professor is already deleted');
    }

    // Soft delete the professor by setting deleted_at timestamp
    const deletedProfessor = await this.userModel
      .findByIdAndUpdate(
        new Types.ObjectId(id),
        { 
          deleted_at: new Date(),
          status: StatusEnum.INACTIVE // Also set status to inactive
        },
        { new: true }
      )
      .populate('role', 'name');

    if (!deletedProfessor) {
      throw new NotFoundException('Professor not found after deletion');
    }

    this.logger.log(
      `Professor soft deleted successfully: ${id} by user: ${user.email}`,
    );

    return {
      message: 'Professor deleted successfully',
      data: {
        id: deletedProfessor._id,
        email: deletedProfessor.email,
        first_name: deletedProfessor.first_name,
        last_name: deletedProfessor.last_name,
        deleted_at: deletedProfessor.deleted_at,
        status: deletedProfessor.status,
        role: deletedProfessor.role,
      },
    };
  }
}
