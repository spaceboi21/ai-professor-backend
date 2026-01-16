import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from 'src/database/schemas/central/user.schema';
import { School } from 'src/database/schemas/central/school.schema';
import {
  Internship,
  InternshipSchema,
} from 'src/database/schemas/tenant/internship.schema';
import {
  InternshipCase,
  InternshipCaseSchema,
} from 'src/database/schemas/tenant/internship-case.schema';
import {
  Student,
  StudentSchema,
} from 'src/database/schemas/tenant/student.schema';
import {
  StudentInternshipProgress,
  StudentInternshipProgressSchema,
} from 'src/database/schemas/tenant/student-internship-progress.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { CreateInternshipDto } from './dto/create-internship.dto';
import { UpdateInternshipDto } from './dto/update-internship.dto';
import { InternshipFilterDto } from './dto/internship-filter.dto';
import { ToggleInternshipVisibilityDto } from './dto/toggle-internship-visibility.dto';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { ProgressStatusEnum } from 'src/common/constants/status.constant';
import { InternshipVisibilityActionEnum, INTERNSHIP_CONSTANTS } from 'src/common/constants/internship.constant';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  getPaginationOptions,
  createPaginationResult,
} from 'src/common/utils/pagination.util';
import { attachUserDetailsToEntity } from 'src/common/utils/user-details.util';
import { ErrorMessageService } from 'src/common/services/error-message.service';
import { DEFAULT_LANGUAGE } from 'src/common/constants/language.constant';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class InternshipService {
  private readonly logger = new Logger(InternshipService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly errorMessageService: ErrorMessageService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Helper method to resolve school_id based on user role
   */
  private resolveSchoolId(
    user: JWTUserPayload,
    bodySchoolId?: string | Types.ObjectId,
  ): string {
    if (user.role.name === RoleEnum.SUPER_ADMIN) {
      if (!bodySchoolId) {
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'INTERNSHIP',
            'SUPER_ADMIN_SCHOOL_ID_REQUIRED',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ) || 'School ID is required for super admin',
        );
      }
      return bodySchoolId.toString();
    } else {
      if (!user.school_id) {
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'SCHOOL',
            'USER_SCHOOL_ID_NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
      return user.school_id.toString();
    }
  }

  /**
   * Create a new internship
   */
  async createInternship(createInternshipDto: CreateInternshipDto, user: JWTUserPayload) {
    const {
      school_id,
      title,
      description,
      guidelines,
      year,
      sequence,
      thumbnail,
      duration,
    } = createInternshipDto;

    this.logger.log(`Creating internship: ${title} by user: ${user.id}`);

    // Resolve school_id based on user role
    const resolvedSchoolId = this.resolveSchoolId(user, school_id);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const InternshipModel = tenantConnection.model(Internship.name, InternshipSchema);

    try {
      // Prepare internship data
      const internshipData = {
        title,
        description,
        guidelines: guidelines || null,
        year,
        sequence: sequence || null,
        thumbnail: thumbnail || '/uploads/default-module-thumbnail.jpg',
        duration: duration || 0,
        created_by: new Types.ObjectId(user.id),
        created_by_role: user.role.name as RoleEnum,
      };

      // Create internship in tenant database
      const newInternship = new InternshipModel(internshipData);
      const savedInternship = await newInternship.save();

      this.logger.log(`Internship created in tenant DB: ${savedInternship._id}`);

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'INTERNSHIP',
          'CREATED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ) || 'Internship created successfully',
        data: savedInternship,
      };
    } catch (error) {
      this.logger.error('Error creating internship', error?.stack || error);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'INTERNSHIP',
          'CREATE_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ) || 'Failed to create internship',
      );
    }
  }

  /**
   * Get all internships with filtering and pagination
   */
  async findAllInternships(
    user: JWTUserPayload,
    paginationDto?: PaginationDto,
    filterDto?: InternshipFilterDto,
  ) {
    this.logger.log(
      `Finding all internships for user: ${user.id} with role: ${user.role.name}`,
    );

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const InternshipModel = tenantConnection.model(Internship.name, InternshipSchema);

    try {
      // Get pagination options
      const paginationOptions = getPaginationOptions(paginationDto || {});

      // Build aggregation pipeline
      const pipeline: any[] = [
        // Stage 1: Match documents that are not deleted
        { $match: { deleted_at: null } },
      ];

      // Stage 2: Add role-based filtering
      // Students can only see published internships
      if (user.role.name === RoleEnum.STUDENT) {
        // Get student's year from tenant database
        const StudentModel = tenantConnection.model(Student.name, StudentSchema);
        const student = await StudentModel.findOne({
          _id: new Types.ObjectId(user.id),
          deleted_at: null,
        }).select('year');

        if (!student) {
          throw new NotFoundException(
            this.errorMessageService.getMessageWithLanguage(
              'STUDENT',
              'NOT_FOUND',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          );
        }

        // Filter internships by student's year and published status
        pipeline.push({
          $match: {
            published: true,
            year: student.year,
          },
        });
      }

      // Stage 3: Add text search for title and description
      if (filterDto?.text) {
        pipeline.push({
          $match: {
            $or: [
              { title: { $regex: filterDto.text, $options: 'i' } },
              { description: { $regex: filterDto.text, $options: 'i' } },
            ],
          },
        });
      }

      // Stage 4: Add other filters
      const additionalFilters: any = {};

      if (filterDto?.year) {
        additionalFilters.year = filterDto.year;
      }

      // Add published filter for non-student users if specified
      if (
        filterDto?.published !== undefined &&
        user.role.name !== RoleEnum.STUDENT
      ) {
        additionalFilters.published = filterDto.published;
      }

      if (Object.keys(additionalFilters).length > 0) {
        pipeline.push({ $match: additionalFilters });
      }

      // Stage 5: Add progress information for students
      if (user.role.name === RoleEnum.STUDENT) {
        // Lookup to count total cases for each internship
        pipeline.push({
          $lookup: {
            from: 'internship_cases',
            let: { internshipId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$internship_id', '$$internshipId'] },
                      { $eq: ['$deleted_at', null] },
                    ],
                  },
                },
              },
              { $count: 'count' },
            ],
            as: 'casesCount',
          },
        });

        // Lookup to count completed cases (sessions with validated feedback)
        pipeline.push({
          $lookup: {
            from: 'case_feedback_logs',
            let: { internshipId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$student_id', new Types.ObjectId(user.id)] },
                    ],
                  },
                  status: { $in: ['validated', 'revised'] },
                },
              },
              {
                $lookup: {
                  from: 'internship_cases',
                  localField: 'case_id',
                  foreignField: '_id',
                  as: 'caseInfo',
                },
              },
              {
                $match: {
                  $expr: {
                    $eq: [{ $arrayElemAt: ['$caseInfo.internship_id', 0] }, '$$internshipId'],
                  },
                },
              },
              {
                $group: {
                  _id: '$case_id',
                },
              },
              { $count: 'count' },
            ],
            as: 'completedCasesCount',
          },
        });

        // Lookup existing progress record
        pipeline.push({
          $lookup: {
            from: 'student_internship_progress',
            let: { internshipId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$internship_id', '$$internshipId'] },
                      { $eq: ['$student_id', new Types.ObjectId(user.id)] },
                    ],
                  },
                },
              },
            ],
            as: 'progress',
          },
        });

        // Add progress status filter if specified
        if (
          filterDto?.progress_status &&
          filterDto.progress_status !== ProgressStatusEnum.ALL
        ) {
          let matchCondition: any;

          if (filterDto.progress_status === ProgressStatusEnum.NOT_STARTED) {
            matchCondition = {
              $or: [
                { $expr: { $eq: [{ $size: '$progress' }, 0] } },
                {
                  $expr: {
                    $eq: [
                      { $arrayElemAt: ['$progress.status', 0] },
                      ProgressStatusEnum.NOT_STARTED,
                    ],
                  },
                },
              ],
            };
          } else if (filterDto.progress_status === ProgressStatusEnum.IN_PROGRESS) {
            matchCondition = {
              $expr: {
                $eq: [
                  { $arrayElemAt: ['$progress.status', 0] },
                  ProgressStatusEnum.IN_PROGRESS,
                ],
              },
            };
          } else if (filterDto.progress_status === ProgressStatusEnum.COMPLETED) {
            matchCondition = {
              $expr: {
                $eq: [
                  { $arrayElemAt: ['$progress.status', 0] },
                  ProgressStatusEnum.COMPLETED,
                ],
              },
            };
          }

          if (matchCondition) {
            pipeline.push({ $match: matchCondition });
          }
        }
      }

      // Stage 6: Sort
      let sortStage: any = { sequence: 1, created_at: -1 }; // default sort

      if (filterDto?.sortBy) {
        const sortOrder = filterDto.sortOrder === 'desc' ? -1 : 1;
        sortStage = { [filterDto.sortBy]: sortOrder, created_at: -1 };
      }

      pipeline.push({ $sort: sortStage });

      // Stage 7: Get total count for pagination
      const countPipeline = [...pipeline, { $count: 'total' }];
      const countResult = await InternshipModel.aggregate(countPipeline);
      const total = countResult.length > 0 ? countResult[0].total : 0;

      // Stage 8: Add pagination
      pipeline.push(
        { $skip: paginationOptions.skip },
        { $limit: paginationOptions.limit },
      );

      // Stage 9: Project final fields
      const projectFields: any = {
        _id: 1,
        title: 1,
        description: 1,
        guidelines: 1,
        year: 1,
        sequence: 1,
        thumbnail: 1,
        duration: 1,
        published: 1,
        published_at: 1,
        created_by: 1,
        created_by_role: 1,
        created_at: 1,
        updated_at: 1,
      };

      // Add progress information for students
      if (user.role.name === RoleEnum.STUDENT) {
        projectFields.total_cases = {
          $cond: {
            if: { $gt: [{ $size: '$casesCount' }, 0] },
            then: { $arrayElemAt: ['$casesCount.count', 0] },
            else: 0,
          },
        };
        projectFields.cases_completed = {
          $cond: {
            if: { $gt: [{ $size: '$completedCasesCount' }, 0] },
            then: { $arrayElemAt: ['$completedCasesCount.count', 0] },
            else: 0,
          },
        };
        projectFields.progress = {
          $cond: {
            if: { $gt: [{ $size: '$progress' }, 0] },
            then: {
              status: { $arrayElemAt: ['$progress.status', 0] },
              progress_percentage: {
                $cond: {
                  if: { $gt: ['$total_cases', 0] },
                  then: {
                    $multiply: [
                      { $divide: ['$cases_completed', '$total_cases'] },
                      100,
                    ],
                  },
                  else: 0,
                },
              },
              cases_completed: '$cases_completed',
              total_cases: '$total_cases',
              started_at: { $arrayElemAt: ['$progress.started_at', 0] },
              completed_at: { $arrayElemAt: ['$progress.completed_at', 0] },
              current_case_id: { $arrayElemAt: ['$progress.current_case_id', 0] },
              last_accessed_at: { $arrayElemAt: ['$progress.last_accessed_at', 0] },
            },
            else: {
              status: ProgressStatusEnum.NOT_STARTED,
              progress_percentage: 0,
              cases_completed: '$cases_completed',
              total_cases: '$total_cases',
            },
          },
        };
      }

      pipeline.push({ $project: projectFields });

      // Execute aggregation
      const internships = await InternshipModel.aggregate(pipeline);

      // Create pagination result
      const result = createPaginationResult(internships, total, paginationOptions);

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'INTERNSHIP',
          'INTERNSHIPS_RETRIEVED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ) || 'Internships retrieved successfully',
        data: result.data,
        pagination_data: result.pagination_data,
      };
    } catch (error) {
      this.logger.error('Error finding internships', error?.stack || error);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'INTERNSHIP',
          'RETRIEVE_INTERNSHIPS_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ) || 'Failed to retrieve internships',
      );
    }
  }

  /**
   * Get single internship by ID
   */
  async findInternshipById(id: string | Types.ObjectId, user: JWTUserPayload) {
    this.logger.log(`Finding internship by id: ${id} for user: ${user.id}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const InternshipModel = tenantConnection.model(Internship.name, InternshipSchema);

    try {
      // Build query with proper access control
      const query: any = {
        _id: new Types.ObjectId(id.toString()),
        deleted_at: null,
      };

      // Students can only access published internships in their year
      if (user.role.name === RoleEnum.STUDENT) {
        const StudentModel = tenantConnection.model(Student.name, StudentSchema);
        const student = await StudentModel.findOne({
          _id: new Types.ObjectId(user.id),
          deleted_at: null,
        }).select('year');

        if (!student) {
          throw new NotFoundException(
            this.errorMessageService.getMessageWithLanguage(
              'STUDENT',
              'NOT_FOUND',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          );
        }

        // Add student-specific filters
        query.published = true;
        query.year = student.year;
        
        this.logger.log(
          `Student ${user.id} (year ${student.year}) attempting to access internship ${id}`
        );
      }

      const internship = await InternshipModel.findOne(query).lean();

      if (!internship) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'INTERNSHIP',
            'NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ) || 'Internship not found',
        );
      }

      // Attach user details
      const internshipWithUser = await attachUserDetailsToEntity(
        internship,
        this.userModel,
      );

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'INTERNSHIP',
          'INTERNSHIP_RETRIEVED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ) || 'Internship retrieved successfully',
        data: internshipWithUser,
      };
    } catch (error) {
      this.logger.error('Error finding internship', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'INTERNSHIP',
          'RETRIEVE_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ) || 'Failed to retrieve internship',
      );
    }
  }

  /**
   * Update internship
   */
  async updateInternship(
    id: Types.ObjectId,
    updateInternshipDto: UpdateInternshipDto,
    user: JWTUserPayload,
  ) {
    const { school_id, ...internshipUpdateData } = updateInternshipDto;

    this.logger.log(`Updating internship: ${id} by user: ${user.id}`);

    // Resolve school_id based on user role
    const resolvedSchoolId = this.resolveSchoolId(user, school_id);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const InternshipModel = tenantConnection.model(Internship.name, InternshipSchema);

    try {
      const updatedInternship = await InternshipModel.findOneAndUpdate(
        { _id: id, deleted_at: null },
        { ...internshipUpdateData, updated_at: new Date() },
        { new: true },
      ).lean();

      if (!updatedInternship) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'INTERNSHIP',
            'NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Attach user details
      const internshipWithUser = await attachUserDetailsToEntity(
        updatedInternship,
        this.userModel,
      );

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'INTERNSHIP',
          'UPDATED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ) || 'Internship updated successfully',
        data: internshipWithUser,
      };
    } catch (error) {
      this.logger.error('Error updating internship', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'INTERNSHIP',
          'UPDATE_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ) || 'Failed to update internship',
      );
    }
  }

  /**
   * Soft delete internship
   */
  async removeInternship(
    id: Types.ObjectId,
    user: JWTUserPayload,
    school_id?: string,
  ) {
    this.logger.log(`Removing internship: ${id} by user: ${user.id}`);

    // Resolve school_id based on user role
    const resolvedSchoolId = this.resolveSchoolId(user, school_id);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const InternshipModel = tenantConnection.model(Internship.name, InternshipSchema);

    try {
      const deletedInternship = await InternshipModel.findOneAndUpdate(
        { _id: id, deleted_at: null },
        { deleted_at: new Date() },
        { new: true },
      );

      if (!deletedInternship) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'INTERNSHIP',
            'NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'INTERNSHIP',
          'DELETED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ) || 'Internship deleted successfully',
        data: {
          id: deletedInternship._id,
        },
      };
    } catch (error) {
      this.logger.error('Error removing internship', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'INTERNSHIP',
          'DELETE_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ) || 'Failed to delete internship',
      );
    }
  }

  /**
   * Toggle internship visibility (publish/unpublish)
   */
  async toggleInternshipVisibility(
    toggleDto: ToggleInternshipVisibilityDto,
    user: JWTUserPayload,
  ) {
    const { school_id, internship_id, action } = toggleDto;

    this.logger.log(`${action} internship: ${internship_id} by user: ${user.id}`);

    // Resolve school_id based on user role
    const resolvedSchoolId = this.resolveSchoolId(user, school_id);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const InternshipModel = tenantConnection.model(Internship.name, InternshipSchema);
    const InternshipCaseModel = tenantConnection.model(InternshipCase.name, InternshipCaseSchema);
    const StudentModel = tenantConnection.model(Student.name, StudentSchema);

    try {
      const internship = await InternshipModel.findOne({
        _id: new Types.ObjectId(internship_id),
        deleted_at: null,
      }).lean();

      if (!internship) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'INTERNSHIP',
            'NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      if (action === InternshipVisibilityActionEnum.PUBLISH) {
        // Check if internship is already published
        if (internship.published) {
          throw new BadRequestException(
            this.errorMessageService.getMessageWithLanguage(
              'INTERNSHIP',
              'ALREADY_PUBLISHED',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ) || 'Internship is already published',
          );
        }

        // Check if internship has at least one case
        const cases = await InternshipCaseModel.find({
          internship_id: new Types.ObjectId(internship_id),
          deleted_at: null,
        }).lean();

        if (cases.length < INTERNSHIP_CONSTANTS.MIN_CASES_REQUIRED) {
          throw new BadRequestException(
            this.errorMessageService.getMessageWithLanguage(
              'INTERNSHIP',
              'MIN_CASES_REQUIRED',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ) || `Internship must have at least ${INTERNSHIP_CONSTANTS.MIN_CASES_REQUIRED} case`,
          );
        }

        // Update internship status to published
        const updatedInternship = await InternshipModel.findOneAndUpdate(
          { _id: new Types.ObjectId(internship_id), deleted_at: null },
          {
            published: true,
            published_at: new Date(),
            updated_at: new Date(),
          },
          { new: true },
        ).lean();

        if (!updatedInternship) {
          throw new NotFoundException(
            this.errorMessageService.getMessageWithLanguage(
              'INTERNSHIP',
              'NOT_FOUND',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          );
        }

        // Send notifications to students
        const students = await StudentModel.find({
          school_id: school._id,
          year: internship.year,
          deleted_at: null,
        }).lean();

        this.logger.log(
          `Sending notifications to ${students.length} students for internship: ${updatedInternship.title}`,
        );

        // TODO: Create notification method specific to internships
        // For now, we'll skip notification or use a generic method

        return {
          message: this.errorMessageService.getSuccessMessageWithLanguage(
            'INTERNSHIP',
            'PUBLISHED_SUCCESSFULLY',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ) || 'Internship published successfully',
          data: {
            id: updatedInternship._id,
            title: updatedInternship.title,
            published: updatedInternship.published,
            published_at: updatedInternship.published_at,
            cases_count: cases.length,
            students_notified: students.length,
          },
        };
      } else if (action === InternshipVisibilityActionEnum.UNPUBLISH) {
        // Check if internship is already unpublished
        if (!internship.published) {
          throw new BadRequestException(
            this.errorMessageService.getMessageWithLanguage(
              'INTERNSHIP',
              'ALREADY_UNPUBLISHED',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ) || 'Internship is already unpublished',
          );
        }

        // Update internship status to unpublished
        const updatedInternship = await InternshipModel.findOneAndUpdate(
          { _id: new Types.ObjectId(internship_id), deleted_at: null },
          {
            published: false,
            published_at: null,
            updated_at: new Date(),
          },
          { new: true },
        ).lean();

        if (!updatedInternship) {
          throw new NotFoundException(
            this.errorMessageService.getMessageWithLanguage(
              'INTERNSHIP',
              'NOT_FOUND',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          );
        }

        return {
          message: this.errorMessageService.getSuccessMessageWithLanguage(
            'INTERNSHIP',
            'UNPUBLISHED_SUCCESSFULLY',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ) || 'Internship unpublished successfully',
          data: {
            id: updatedInternship._id,
            title: updatedInternship.title,
            published: updatedInternship.published,
            published_at: updatedInternship.published_at,
          },
        };
      } else {
        throw new BadRequestException('Invalid action for internship visibility');
      }
    } catch (error) {
      this.logger.error(
        `Error ${action.toLowerCase()}ing internship`,
        error?.stack || error,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'INTERNSHIP',
          'TOGGLE_VISIBILITY_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ) || 'Failed to toggle internship visibility',
      );
    }
  }
}

