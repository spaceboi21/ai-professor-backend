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
  Module,
  ModuleSchema,
} from 'src/database/schemas/tenant/module.schema';
import {
  Chapter,
  ChapterSchema,
} from 'src/database/schemas/tenant/chapter.schema';
import {
  QuizGroup,
  QuizGroupSchema,
} from 'src/database/schemas/tenant/quiz-group.schema';
import {
  Student,
  StudentSchema,
} from 'src/database/schemas/tenant/student.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { ModuleFilterDto, ModuleSortBy } from './dto/module-filter.dto';
import { ToggleModuleVisibilityDto } from './dto/toggle-module-visibility.dto';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { RoleEnum } from 'src/common/constants/roles.constant';
import {
  attachUserDetails,
  attachUserDetailsToEntity,
} from 'src/common/utils/user-details.util';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  getPaginationOptions,
  createPaginationResult,
} from 'src/common/utils/pagination.util';
import { DifficultyEnum } from 'src/common/constants/difficulty.constant';
import {
  StudentModuleProgress,
  StudentModuleProgressSchema,
} from 'src/database/schemas/tenant/student-module-progress.schema';
import { ProgressStatusEnum } from 'src/common/constants/status.constant';
import {
  ModuleVisibilityActionEnum,
  MODULE_CONSTANTS,
} from 'src/common/constants/module.constant';
import { NotificationsService } from '../notifications/notifications.service';
import { ModuleAssignmentService } from './module-assignment.service';
import {
  ModuleProfessorAssignment,
  ModuleProfessorAssignmentSchema,
} from 'src/database/schemas/tenant/module-professor-assignment.schema';
import { QuizTypeEnum } from 'src/common/constants/quiz.constant';
import { PythonService, ModuleValidationResponse } from './python.service';
import { ErrorMessageService } from 'src/common/services/error-message.service';
import {
  DEFAULT_LANGUAGE,
  LanguageEnum,
} from 'src/common/constants/language.constant';

@Injectable()
export class ModulesService {
  private readonly logger = new Logger(ModulesService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly notificationsService: NotificationsService,
    private readonly moduleAssignmentService: ModuleAssignmentService,
    private readonly pythonService: PythonService,
    private readonly errorMessageService: ErrorMessageService,
  ) {}

  /**
   * Helper method to resolve school_id based on user role
   * For SUPER_ADMIN: school_id must be provided in the request body
   * For other roles: use school_id from user context
   */
  private resolveSchoolId(
    user: JWTUserPayload,
    bodySchoolId?: string | Types.ObjectId,
  ): string {
    if (user.role.name === RoleEnum.SUPER_ADMIN) {
      if (!bodySchoolId) {
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'MODULE',
            'SUPER_ADMIN_SCHOOL_ID_REQUIRED',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
      return bodySchoolId.toString();
    } else {
      // For other roles, use school_id from user context
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

  async createModule(createModuleDto: CreateModuleDto, user: JWTUserPayload) {
    const {
      school_id,
      title,
      subject,
      description,
      category,
      difficulty,
      tags,
      thumbnail,
      year,
    } = createModuleDto;

    this.logger.log(`Creating module: ${title} by user: ${user.id}`);

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

    // Validate year is between 1 and 5
    if (year < 1 || year > 5) {
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'MODULE',
          'INVALID_YEAR',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ) || 'Year must be between 1 and 5',
      );
    }

    // Validate module against knowledge base if enabled
    let validationResult: ModuleValidationResponse | null = null;
    const isValidationDisabled =
      process.env.VALIDATE_MODULE_KNOWLEDGE_BASE === 'false';

    if (isValidationDisabled) {
      this.logger.log(
        'Module knowledge base validation is disabled by config.',
      );
    } else {
      try {
        this.logger.log(`Validating module: ${title} against knowledge base`);
        validationResult = await this.pythonService.validateModule(
          title,
          subject,
          description,
          category || 'general',
        );
        this.logger.log(
          `Module validation completed: ${validationResult?.module_exists}`,
        );
      } catch (error) {
        this.logger.error('Module validation failed', error?.stack || error);
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'MODULE',
            'VALIDATION_FAILED',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
    }

    // Check if module validation passed
    if (
      !isValidationDisabled &&
      validationResult &&
      !validationResult.module_exists
    ) {
      throw new BadRequestException(
        validationResult.message ||
          'Module validation failed. Please choose a different topic.',
      );
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);

    try {
      // Prepare module data with validation info
      const moduleData = {
        title,
        subject,
        description,
        category,
        duration: 0, // Always start at 0, will be updated as chapters are added
        difficulty,
        tags: tags || [],
        thumbnail: thumbnail || '/uploads/default-module-thumbnail.jpg',
        year,
        created_by: new Types.ObjectId(user.id),
        created_by_role: user.role.name as RoleEnum,
        // Add validation fields
        is_validated: !isValidationDisabled,
        validation_confidence_score: validationResult?.confidence_score || 0,
        validation_coverage_type:
          validationResult?.validation_details?.coverage_type || null,
        validation_max_similarity_score:
          validationResult?.validation_details?.max_similarity_score || 0,
      };

      // Create module in tenant database
      const newModule = new ModuleModel(moduleData);

      const savedModule = await newModule.save();

      this.logger.log(`Module created in tenant DB: ${savedModule._id}`);

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'MODULE',
          'CREATED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: {
          id: savedModule._id,
          title: savedModule.title,
          subject: savedModule.subject,
          description: savedModule.description,
          category: savedModule.category,
          duration: savedModule.duration,
          difficulty: savedModule.difficulty,
          tags: savedModule.tags,
          year: savedModule.year,
          created_by: savedModule.created_by,
          created_by_role: savedModule.created_by_role,
          is_validated: savedModule.is_validated,
          validation_confidence_score: savedModule.validation_confidence_score,
          validation_coverage_type: savedModule.validation_coverage_type,
          validation_max_similarity_score:
            savedModule.validation_max_similarity_score,
          created_at: savedModule.created_at,
          updated_at: savedModule.updated_at,
        },
      };
    } catch (error) {
      this.logger.error('Error creating module', error?.stack || error);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'MODULE',
          'CREATE_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  // Helper to recalculate and update module duration
  async recalculateModuleDuration(
    moduleId: Types.ObjectId,
    tenantConnection: any,
  ) {
    const ChapterModel = tenantConnection.model(Chapter.name, ChapterSchema);
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);
    const chapters = await ChapterModel.find({
      module_id: moduleId,
      deleted_at: null,
    });
    const totalDuration = chapters.reduce(
      (sum, chapter) => sum + (chapter.duration || 0),
      0,
    );
    this.logger.log(
      `Total duration for module: ${moduleId} is ${totalDuration}`,
    );
    await ModuleModel.findByIdAndUpdate(moduleId, { duration: totalDuration });
    return totalDuration;
  }

  async findAllModules(
    user: JWTUserPayload,
    paginationDto?: PaginationDto,
    filterDto?: ModuleFilterDto,
  ) {
    this.logger.log(
      `Finding all modules for user: ${user.id} with role: ${user.role.name}`,
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
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);

    try {
      // Get pagination options
      const paginationOptions = getPaginationOptions(paginationDto || {});

      // Build aggregation pipeline for fast query with text search
      const pipeline: any[] = [
        // Stage 1: Match documents that are not deleted
        { $match: { deleted_at: null } },
      ];

      // Stage 2: Add role-based filtering
      // Students can only see published modules
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

        // Filter modules by student's year and published status
        pipeline.push({
          $match: {
            published: true,
            year: student.year
          },
        });
      }

      // Professors can only see modules they are assigned to
      if (user.role.name === RoleEnum.PROFESSOR) {
        // Get professor's assigned modules
        const AssignmentModel = tenantConnection.model(
          ModuleProfessorAssignment.name,
          ModuleProfessorAssignmentSchema,
        );

        const assignments = await AssignmentModel.find({
          professor_id: new Types.ObjectId(user.id),
          is_active: true,
        }).lean();

        const assignedModuleIds = assignments.map((a) => a.module_id);

        if (assignedModuleIds.length === 0) {
          // Professor has no assigned modules, return empty result
          return {
            message: this.errorMessageService.getSuccessMessageWithLanguage(
              'MODULE',
              'NO_ASSIGNED_MODULES',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
            data: [],
            pagination_data: {
              page: paginationOptions.page,
              limit: paginationOptions.limit,
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false,
            },
          };
        }

        // Filter to only assigned modules
        pipeline.push({
          $match: {
            _id: { $in: assignedModuleIds },
          },
        });
      }

      // Stage 2.5: Add progress information for students (always include for students)
      if (user.role.name === RoleEnum.STUDENT) {
        // Left join with student progress to get progress status
        pipeline.push({
          $lookup: {
            from: 'student_module_progress',
            let: { moduleId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$module_id', '$$moduleId'] },
                      { $eq: ['$student_id', new Types.ObjectId(user.id)] },
                    ],
                  },
                },
              },
            ],
            as: 'progress',
          },
        });

        // Stage 2.6: Add progress status filter for students (right after progress lookup)
        if (
          filterDto?.progress_status &&
          filterDto.progress_status !== ProgressStatusEnum.ALL
        ) {
          let matchCondition: any;

          if (filterDto.progress_status === ProgressStatusEnum.NOT_STARTED) {
            // For NOT_STARTED, match modules with no progress or explicit NOT_STARTED status
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
          } else if (
            filterDto.progress_status === ProgressStatusEnum.IN_PROGRESS
          ) {
            // For IN_PROGRESS, match modules with IN_PROGRESS status
            matchCondition = {
              $expr: {
                $eq: [
                  { $arrayElemAt: ['$progress.status', 0] },
                  ProgressStatusEnum.IN_PROGRESS,
                ],
              },
            };
          } else if (
            filterDto.progress_status === ProgressStatusEnum.COMPLETED
          ) {
            // For COMPLETED, match modules with COMPLETED status
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
            pipeline.push({
              $match: matchCondition,
            });
          }
        }
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

      if (filterDto?.difficulty) {
        additionalFilters.difficulty = filterDto.difficulty;
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

      // Stage 5: Add computed fields for better sorting
      const addFieldsStage: any = {
        title_lower: { $toLower: '$title' },
        difficulty_order: {
          $switch: {
            branches: [
              {
                case: { $eq: ['$difficulty', DifficultyEnum.BEGINNER] },
                then: 1,
              },
              {
                case: { $eq: ['$difficulty', DifficultyEnum.INTERMEDIATE] },
                then: 2,
              },
              {
                case: { $eq: ['$difficulty', DifficultyEnum.ADVANCED] },
                then: 3,
              },
            ],
            default: 0,
          },
        },
        // Add sequence ordering - modules with sequence come first, then by sequence number
        sequence_order: {
          $cond: {
            if: { $ne: ['$sequence', null] },
            then: '$sequence',
            else: 999999, // Modules without sequence go to the end
          },
        },
      };

      // Add progress status ordering for students
      if (user.role.name === RoleEnum.STUDENT) {
        addFieldsStage.progress_status_order = {
          $switch: {
            branches: [
              {
                case: {
                  $or: [
                    { $eq: [{ $size: '$progress' }, 0] }, // No progress record exists
                    {
                      $eq: [
                        { $arrayElemAt: ['$progress.status', 0] },
                        ProgressStatusEnum.NOT_STARTED,
                      ],
                    },
                  ],
                },
                then: 2, // NOT_STARTED gets middle priority
              },
              {
                case: {
                  $eq: [
                    { $arrayElemAt: ['$progress.status', 0] },
                    ProgressStatusEnum.IN_PROGRESS,
                  ],
                },
                then: 1, // IN_PROGRESS gets highest priority for ASC
              },
              {
                case: {
                  $eq: [
                    { $arrayElemAt: ['$progress.status', 0] },
                    ProgressStatusEnum.COMPLETED,
                  ],
                },
                then: 3, // COMPLETED gets lowest priority for ASC
              },
            ],
            default: 2, // Default to NOT_STARTED priority
          },
        };
      }

      pipeline.push({ $addFields: addFieldsStage });

      // Stage 6: Sort
      let sortStage: any = { sequence_order: 1, created_at: -1 }; // default sort by sequence first, then by creation date

      if (filterDto?.sortBy) {
        const sortOrder = filterDto.sortOrder === 'desc' ? -1 : 1;

        switch (filterDto.sortBy) {
          case ModuleSortBy.TITLE:
            sortStage = { sequence_order: 1, title_lower: sortOrder, created_at: -1 };
            break;
          case ModuleSortBy.DIFFICULTY:
            sortStage = { sequence_order: 1, difficulty_order: sortOrder, created_at: -1 };
            break;
          case ModuleSortBy.DURATION:
            sortStage = { sequence_order: 1, duration: sortOrder, created_at: -1 };
            break;
          case ModuleSortBy.CREATED_AT:
            sortStage = { sequence_order: 1, created_at: sortOrder };
            break;
          case ModuleSortBy.PROGRESS_STATUS:
            // Only allow progress status sorting for students
            if (user.role.name === RoleEnum.STUDENT) {
              sortStage = { sequence_order: 1, progress_status_order: sortOrder, created_at: -1 };
            } else {
              sortStage = { sequence_order: 1, created_at: -1 }; // fallback for non-students
            }
            break;
          case ModuleSortBy.SEQUENCE:
            // Allow explicit sequence sorting
            sortStage = { sequence_order: sortOrder, created_at: -1 };
            break;
          default:
            sortStage = { sequence_order: 1, created_at: -1 };
        }
      }

      pipeline.push({ $sort: sortStage });

      // Stage 7: Get total count for pagination (faster with facet)
      const countPipeline = [...pipeline, { $count: 'total' }];
      const countResult = await ModuleModel.aggregate(countPipeline);
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
        subject: 1,
        description: 1,
        category: 1,
        duration: 1,
        difficulty: 1,
        tags: 1,
        thumbnail: 1,
        published: 1,
        published_at: 1,
        year: 1,
        sequence: 1,
        created_by: 1,
        created_by_role: 1,
        created_at: 1,
        updated_at: 1,
      };

      // Add progress information for students (always include for students)
      if (user.role.name === RoleEnum.STUDENT) {
        projectFields.progress = {
          $cond: {
            if: { $gt: [{ $size: '$progress' }, 0] },
            then: { $arrayElemAt: ['$progress', 0] },
            else: {
              status: ProgressStatusEnum.NOT_STARTED,
              progress_percentage: 0,
              chapters_completed: 0,
              total_chapters: 0,
              module_quiz_completed: false,
              started_at: null,
              completed_at: null,
              last_accessed_at: null,
            },
          },
        };
      }

      pipeline.push({ $project: projectFields });

      // Execute aggregation
      const modules = await ModuleModel.aggregate(pipeline);

      // Add isLock logic for students
      if (user.role.name === RoleEnum.STUDENT) {
        // Get student's year from tenant database
        const StudentModel = tenantConnection.model(Student.name, StudentSchema);
        const student = await StudentModel.findOne({
          _id: new Types.ObjectId(user.id),
          deleted_at: null,
        }).select('year');

        if (student) {
          // Check if this is the first page to apply safety fallback
          const isFirstPage = paginationOptions.page === 1;

          // Get all published modules in student's current year to determine lowest sequence
          const allCurrentYearModules = await ModuleModel
            .find({
              year: student.year,
              deleted_at: null,
              published: true,
              sequence: { $exists: true, $ne: null },
            })
            .sort({ sequence: 1 })
            .lean();

          const lowestSequenceInCurrentYear = allCurrentYearModules.length > 0
            ? Math.min(...allCurrentYearModules.map(m => m.sequence))
            : 1;

          // Group modules by year
          const modulesByYear = {};
          modules.forEach(module => {
            if (!modulesByYear[module.year]) {
              modulesByYear[module.year] = [];
            }
            modulesByYear[module.year].push(module);
          });

          // Calculate highest completed sequence for each year
          // A module is considered completed for progression when chapters are done (90%+)
          // Module quiz is NOT required for unlocking next modules
          const highestCompletedByYear = {};

          for (const year of Object.keys(modulesByYear)) {
            // Only consider published modules with sequence for completion calculation
            const yearModules = modulesByYear[year].filter(module =>
              module.sequence !== null && module.published === true
            );

            if (yearModules.length > 0) {
              const completedModules = yearModules.filter(module =>
                module.progress && module.progress.progress_percentage >= 90
              );

              if (completedModules.length > 0) {
                highestCompletedByYear[year] = Math.max(
                  ...completedModules.map(module => module.sequence)
                );
              } else {
                highestCompletedByYear[year] = 0;
              }
            } else {
              highestCompletedByYear[year] = 0;
            }
          }

          // Add isLock field to each module based on year-wise sequence
          modules.forEach(module => {
            if (module.sequence !== null) {
              const highestCompletedInYear = highestCompletedByYear[module.year] || 0;

              // For current year: sequence logic with safety fallback
              if (module.year === student.year) {
                // Safety fallback: Only on first page, allow access to the lowest sequence
                if (isFirstPage && module.sequence === lowestSequenceInCurrentYear && highestCompletedInYear === 0) {
                  module.isLock = false;
                } else {
                  // Find the next available sequence after the highest completed
                  const nextAvailableSequence = this.findNextAvailableSequence(
                    allCurrentYearModules,
                    highestCompletedInYear
                  );
                  module.isLock = module.sequence > nextAvailableSequence;
                }
              }
              // For previous years: all modules should be unlocked (already accessible)
              else if (module.year < student.year) {
                module.isLock = false;
              }
              // For future years: all modules should be locked
              else if (module.year > student.year) {
                module.isLock = true;
              }
            } else {
              // Modules without sequence follow year-based access
              if (module.year <= student.year) {
                module.isLock = false; // Previous and current year modules are accessible
              } else {
                module.isLock = true; // Future year modules are locked
              }
            }
          });
        } else {
          // If student not found, lock all modules
          modules.forEach(module => {
            module.isLock = true;
          });
        }
      }

      // Create pagination result
      const result = createPaginationResult(modules, total, paginationOptions);

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'MODULE',
          'MODULES_RETRIEVED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: result.data,
        pagination_data: result.pagination_data,
      };
    } catch (error) {
      this.logger.error('Error finding modules', error?.stack || error);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'MODULE',
          'RETRIEVE_MODULES_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  async findModuleById(id: string | Types.ObjectId, user: JWTUserPayload) {
    this.logger.log(`Finding module by id: ${id} for user: ${user.id}`);

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
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);

    try {
      // Build aggregation pipeline for single module with progress
      const pipeline: any[] = [
        // Stage 1: Match the specific module
        {
          $match: {
            _id: new Types.ObjectId(id.toString()),
            deleted_at: null,
          },
        },
      ];

      // Stage 2: Add progress information for students
      if (user.role.name === RoleEnum.STUDENT) {
        // Lookup student progress
        pipeline.push({
          $lookup: {
            from: 'student_module_progress',
            let: { moduleId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$module_id', '$$moduleId'] },
                      { $eq: ['$student_id', new Types.ObjectId(user.id)] },
                    ],
                  },
                },
              },
            ],
            as: 'progress',
          },
        });

        // Add progress field
        pipeline.push({
          $addFields: {
            progress: {
              $cond: {
                if: { $gt: [{ $size: '$progress' }, 0] },
                then: { $arrayElemAt: ['$progress', 0] },
                else: {
                  status: ProgressStatusEnum.NOT_STARTED,
                  progress_percentage: 0,
                  chapters_completed: 0,
                  total_chapters: 0,
                  module_quiz_completed: false,
                  started_at: null,
                  completed_at: null,
                  last_accessed_at: null,
                },
              },
            },
          },
        });
      }

      // Execute aggregation
      const modules = await ModuleModel.aggregate(pipeline);

      if (modules.length === 0) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'MODULE',
            'NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      const module = modules[0];

      // Add isLock logic for students
      if (user.role.name === RoleEnum.STUDENT) {
        // Get student's year from tenant database
        const StudentModel = tenantConnection.model(Student.name, StudentSchema);
        const student = await StudentModel.findOne({
          _id: new Types.ObjectId(user.id),
          deleted_at: null,
        }).select('year');

        if (student) {
          // Get all published modules in the same year to calculate highest completed sequence
          const allModules = await ModuleModel
            .find({
              year: module.year,
              deleted_at: null,
              published: true,
              sequence: { $exists: true, $ne: null },
            })
            .lean();

          // Get student's completed modules
          const StudentModuleProgressModel = tenantConnection.model(
            StudentModuleProgress.name,
            StudentModuleProgressSchema,
          );

          const completedProgress = await StudentModuleProgressModel.find({
            student_id: new Types.ObjectId(user.id),
            status: ProgressStatusEnum.COMPLETED,
          });

          const completedModuleIds = completedProgress.map(p => p.module_id.toString());

          // Find the highest completed sequence in this year (only from published modules)
          let highestCompletedSequence = 0;
          const completedModules = allModules.filter(m =>
            completedModuleIds.includes(m._id.toString()) && m.published === true
          );

          if (completedModules.length > 0) {
            highestCompletedSequence = Math.max(
              ...completedModules.map(m => m.sequence)
            );
          }

          // Add isLock field to the module based on year-wise sequence
          if (module.sequence !== null) {
            // Get the lowest sequence in this year for safety fallback
            const lowestSequenceInYear = allModules.length > 0
              ? Math.min(...allModules.map(m => m.sequence))
              : 1;

            // For current year: sequence logic with safety fallback
            if (module.year === student.year) {
              // Safety fallback: Allow access to the lowest sequence if no progress exists
              if (module.sequence === lowestSequenceInYear && highestCompletedSequence === 0) {
                module.isLock = false;
              } else {
                // Find the next available sequence after the highest completed
                const nextAvailableSequence = this.findNextAvailableSequence(
                  allModules,
                  highestCompletedSequence
                );
                module.isLock = module.sequence > nextAvailableSequence;
              }
            }
            // For previous years: all modules should be unlocked (already accessible)
            else if (module.year < student.year) {
              module.isLock = false;
            }
            // For future years: all modules should be locked
            else if (module.year > student.year) {
              module.isLock = true;
            }
          } else {
            // Modules without sequence follow year-based access
            if (module.year <= student.year) {
              module.isLock = false; // Previous and current year modules are accessible
            } else {
              module.isLock = true; // Future year modules are locked
            }
          }
        } else {
          // If student not found, lock the module
          module.isLock = true;
        }
      }

      // Check professor access if user is a professor
      if (user.role.name === RoleEnum.PROFESSOR) {
        const accessCheck =
          await this.moduleAssignmentService.checkProfessorModuleAccess(
            new Types.ObjectId(user.id),
            new Types.ObjectId(id.toString()),
            user,
          );

        if (!accessCheck.has_access) {
          throw new NotFoundException(
            this.errorMessageService.getMessageWithLanguage(
              'MODULE',
              'NOT_FOUND_OR_ACCESS_DENIED',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          );
        }
      }

      // Attach user details to module
      const moduleWithUser = await attachUserDetailsToEntity(
        module,
        this.userModel,
      );

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'MODULE',
          'MODULE_RETRIEVED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: moduleWithUser,
      };
    } catch (error) {
      this.logger.error('Error finding module', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'MODULE',
          'RETRIEVE_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  async updateModule(
    id: Types.ObjectId,
    updateModuleDto: UpdateModuleDto,
    user: JWTUserPayload,
  ) {
    const { school_id, ...moduleUpdateData } = updateModuleDto;

    this.logger.log(`Updating module: ${id} by user: ${user.id}`);

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

    // Only school admins can update year
    if (user.role.name !== RoleEnum.SCHOOL_ADMIN) {
      moduleUpdateData.year = undefined;
    }

    // Validate year if provided
    if (moduleUpdateData.year !== undefined) {
      // Validate year is between 1 and 5
      if (moduleUpdateData.year < 1 || moduleUpdateData.year > 5) {
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'MODULE',
            'INVALID_YEAR',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ) || 'Year must be between 1 and 5',
        );
      }
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);

    try {
      // Check professor access if user is a professor
      if (user.role.name === RoleEnum.PROFESSOR) {
        const accessCheck =
          await this.moduleAssignmentService.checkProfessorModuleAccess(
            new Types.ObjectId(user.id),
            id,
            user,
          );

        if (!accessCheck.has_access) {
          throw new NotFoundException(
            this.errorMessageService.getMessageWithLanguage(
              'MODULE',
              'NOT_FOUND_OR_ACCESS_DENIED',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          );
        }
      }

      const updatedModule = await ModuleModel.findOneAndUpdate(
        { _id: id, deleted_at: null },
        { ...moduleUpdateData, updated_at: new Date() },
        { new: true },
      ).lean();

      if (!updatedModule) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'MODULE',
            'NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Attach user details to module
      const moduleWithUser = await attachUserDetailsToEntity(
        updatedModule,
        this.userModel,
      );

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'MODULE',
          'UPDATED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: moduleWithUser,
      };
    } catch (error) {
      this.logger.error('Error updating module', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'MODULE',
          'UPDATE_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  async removeModule(
    id: Types.ObjectId,
    user: JWTUserPayload,
    school_id?: string,
  ) {
    this.logger.log(`Removing module: ${id} by user: ${user.id}`);

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
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);
    const AssignmentModel = tenantConnection.model(
      ModuleProfessorAssignment.name,
      ModuleProfessorAssignmentSchema,
    );

    try {
      // Check professor access if user is a professor
      if (user.role.name === RoleEnum.PROFESSOR) {
        const accessCheck =
          await this.moduleAssignmentService.checkProfessorModuleAccess(
            new Types.ObjectId(user.id),
            id,
            user,
          );

        if (!accessCheck.has_access) {
          throw new NotFoundException(
            this.errorMessageService.getMessageWithLanguage(
              'MODULE',
              'NOT_FOUND_OR_ACCESS_DENIED',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          );
        }
      }

      // Check if module exists before proceeding
      const moduleToDelete = await ModuleModel.findOne({
        _id: new Types.ObjectId(id.toString()),
        deleted_at: null,
      });

      if (!moduleToDelete) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'MODULE',
            'NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Deactivate all module assignments for this module
      const assignmentUpdateResult = await AssignmentModel.updateMany(
        {
          module_id: new Types.ObjectId(id.toString()),
          is_active: true,
        },
        {
          is_active: false,
          updated_at: new Date(),
          deleted_at: new Date(),
        },
      );

      this.logger.log(
        `Deactivated ${assignmentUpdateResult.modifiedCount} module assignments for module: ${id}`,
      );

      // Soft delete the module
      const deletedModule = await ModuleModel.findOneAndUpdate(
        { _id: id, deleted_at: null },
        { deleted_at: new Date() },
        { new: true },
      );

      if (!deletedModule) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'MODULE',
            'NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Handle sequence reordering if module has a sequence
      if (deletedModule.sequence) {
        await this.handleModuleSoftDelete(id.toString(), user, school_id);
      }

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'MODULE',
          'DELETED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: {
          id: deletedModule._id,
          deactivated_assignments: assignmentUpdateResult.modifiedCount,
        },
      };
    } catch (error) {
      this.logger.error('Error removing module', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'MODULE',
          'DELETE_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  async toggleModuleVisibility(
    publishModuleDto: ToggleModuleVisibilityDto,
    user: JWTUserPayload,
  ) {
    const { school_id, module_id, action } = publishModuleDto;

    this.logger.log(`${action} module: ${module_id} by user: ${user.id}`);

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
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);
    const ChapterModel = tenantConnection.model(Chapter.name, ChapterSchema);
    const QuizGroupModel = tenantConnection.model(
      QuizGroup.name,
      QuizGroupSchema,
    );
    const StudentModel = tenantConnection.model(Student.name, StudentSchema);

    try {
      const module = await ModuleModel.findOne({
        _id: new Types.ObjectId(module_id),
        deleted_at: null,
      }).lean();

      if (!module) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'MODULE',
            'NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Check professor access if user is a professor
      if (user.role.name === RoleEnum.PROFESSOR) {
        const accessCheck =
          await this.moduleAssignmentService.checkProfessorModuleAccess(
            new Types.ObjectId(user.id),
            new Types.ObjectId(module_id),
            user,
          );

        if (!accessCheck.has_access) {
          throw new NotFoundException(
            this.errorMessageService.getMessageWithLanguage(
              'MODULE',
              'NOT_FOUND_OR_ACCESS_DENIED',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          );
        }
      }

      if (action === ModuleVisibilityActionEnum.PUBLISH) {
        // Check if module is already published
        if (module.published) {
          throw new BadRequestException(
            this.errorMessageService.getMessageWithLanguage(
              'MODULE',
              'MODULE_ALREADY_PUBLISHED',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          );
        }

        // Check if module has at least one chapter
        const chapters = await ChapterModel.find({
          module_id: new Types.ObjectId(module_id),
          deleted_at: null,
        }).lean();

        if (chapters.length < MODULE_CONSTANTS.MIN_CHAPTERS_REQUIRED) {
          throw new BadRequestException(
            this.errorMessageService.getMessageWithLanguage(
              'MODULE',
              'MODULE_MIN_CHAPTERS_REQUIRED',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          );
        }

        // Check if module has at least one quiz group
        const quizGroups = await QuizGroupModel.find({
          module_id: new Types.ObjectId(module_id),
          type: QuizTypeEnum.MODULE,
          deleted_at: null,
        }).lean();

        if (quizGroups.length < MODULE_CONSTANTS.MIN_QUIZ_GROUPS_REQUIRED) {
          throw new BadRequestException(
            this.errorMessageService.getMessageWithLanguage(
              'MODULE',
              'MODULE_MIN_QUIZ_GROUPS_REQUIRED',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          );
        }

        // Update module status to published
        const updatedModule = await ModuleModel.findOneAndUpdate(
          { _id: new Types.ObjectId(module_id), deleted_at: null },
          {
            published: true,
            published_at: new Date(),
            updated_at: new Date(),
          },
          { new: true },
        ).lean();

        if (!updatedModule) {
          throw new NotFoundException(
            this.errorMessageService.getMessageWithLanguage(
              'MODULE',
              'NOT_FOUND',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          );
        }

        // Send in-app notifications to students
        const students = await StudentModel.find({
          school_id: school._id,
          deleted_at: null,
        }).lean();

        this.logger.log(
          `Sending notifications to ${students.length} students for module: ${updatedModule.title}`,
        );

        // Send in-app notifications to all students in the school
        try {
          await this.notificationsService.createModulePublishedNotification(
            school._id,
            updatedModule.title,
            updatedModule._id,
          );
        } catch (error) {
          this.logger.error(
            `Failed to send notifications for module ${updatedModule.title}:`,
            error,
          );
        }

        return {
          message: this.errorMessageService.getSuccessMessageWithLanguage(
            'MODULE',
            'PUBLISHED_SUCCESSFULLY',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
          data: {
            id: updatedModule._id,
            title: updatedModule.title,
            published: updatedModule.published,
            published_at: updatedModule.published_at,
            chapters_count: chapters.length,
            quiz_groups_count: quizGroups.length,
            students_notified: students.length,
          },
        };
      } else if (action === ModuleVisibilityActionEnum.UNPUBLISH) {
        // Check if module is already unpublished
        if (!module.published) {
          throw new BadRequestException(
            this.errorMessageService.getMessageWithLanguage(
              'MODULE',
              'MODULE_ALREADY_UNPUBLISHED',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          );
        }

        // Update module status to unpublished
        const updatedModule = await ModuleModel.findOneAndUpdate(
          { _id: new Types.ObjectId(module_id), deleted_at: null },
          {
            published: false,
            published_at: null,
            updated_at: new Date(),
          },
          { new: true },
        ).lean();

        if (!updatedModule) {
          throw new NotFoundException(
            this.errorMessageService.getMessageWithLanguage(
              'MODULE',
              'NOT_FOUND',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          );
        }

        // Send in-app notifications to students about unpublishing
        const students = await StudentModel.find({
          school_id: school._id,
          deleted_at: null,
        }).lean();

        this.logger.log(
          `Sending unpublish notifications to ${students.length} students for module: ${updatedModule.title}`,
        );

        // Send in-app notifications to all students in the school
        try {
          await this.notificationsService.createModuleUnpublishedNotification(
            school._id,
            updatedModule.title,
            updatedModule._id,
          );
        } catch (error) {
          this.logger.error(
            `Failed to send unpublish notifications for module ${updatedModule.title}:`,
            error,
          );
        }

        return {
          message: this.errorMessageService.getSuccessMessageWithLanguage(
            'MODULE',
            'UNPUBLISHED_SUCCESSFULLY',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
          data: {
            id: updatedModule._id,
            title: updatedModule.title,
            published: updatedModule.published,
            published_at: updatedModule.published_at,
            students_notified: students.length,
          },
        };
      } else {
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'MODULE',
            'INVALID_ACTION_FOR_MODULE_VISIBILITY',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
    } catch (error) {
      this.logger.error(
        `Error ${action.toLowerCase()}ing module`,
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
          'MODULE',
          'TOGGLE_MODULE_VISIBILITY_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  async getModuleOverview(user: JWTUserPayload) {
    this.logger.log(`Getting module overview for student: ${user.id}`);

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
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);

    try {
      // Build aggregation pipeline for module overview
      const pipeline: any[] = [
        // Stage 1: Match published modules only
        { $match: { deleted_at: null, published: true } },

        // Stage 2: Lookup student progress for each module
        {
          $lookup: {
            from: 'student_module_progress',
            let: { moduleId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$module_id', '$$moduleId'] },
                      { $eq: ['$student_id', new Types.ObjectId(user.id)] },
                    ],
                  },
                },
              },
            ],
            as: 'progress',
          },
        },

        // Stage 3: Add computed fields
        {
          $addFields: {
            // Determine status based on progress
            status: {
              $cond: {
                if: { $gt: [{ $size: '$progress' }, 0] },
                then: { $arrayElemAt: ['$progress.status', 0] },
                else: ProgressStatusEnum.NOT_STARTED,
              },
            },
            // Get progress percentage
            progress_percentage: {
              $cond: {
                if: { $gt: [{ $size: '$progress' }, 0] },
                then: { $arrayElemAt: ['$progress.progress_percentage', 0] },
                else: 0,
              },
            },
            // Get last accessed date
            last_accessed_at: {
              $cond: {
                if: { $gt: [{ $size: '$progress' }, 0] },
                then: { $arrayElemAt: ['$progress.last_accessed_at', 0] },
                else: null,
              },
            },
          },
        },

        // Stage 4: Group to calculate statistics
        {
          $group: {
            _id: null,
            total_modules: { $sum: 1 },
            total_progress: { $sum: '$progress_percentage' },
            completed_modules: {
              $sum: {
                $cond: [
                  { $eq: ['$status', ProgressStatusEnum.COMPLETED] },
                  1,
                  0,
                ],
              },
            },
            in_progress_modules: {
              $sum: {
                $cond: [
                  { $eq: ['$status', ProgressStatusEnum.IN_PROGRESS] },
                  1,
                  0,
                ],
              },
            },
            not_started_modules: {
              $sum: {
                $cond: [
                  { $eq: ['$status', ProgressStatusEnum.NOT_STARTED] },
                  1,
                  0,
                ],
              },
            },
            // Collect all modules for recent calculation
            all_modules: {
              $push: {
                _id: '$_id',
                title: '$title',
                subject: '$subject',
                status: '$status',
                progress_percentage: '$progress_percentage',
                last_accessed_at: '$last_accessed_at',
              },
            },
          },
        },

        // Stage 5: Add computed overall progress percentage
        {
          $addFields: {
            overall_progress_percentage: {
              $cond: {
                if: { $gt: ['$total_modules', 0] },
                then: {
                  $round: [
                    { $divide: ['$total_progress', '$total_modules'] },
                    2,
                  ],
                },
                else: 0,
              },
            },
          },
        },

        // Stage 6: Unwind to get individual modules back for recent calculation
        {
          $unwind: '$all_modules',
        },

        // Stage 7: Sort by last accessed date (most recent first), then by progress
        {
          $sort: {
            'all_modules.last_accessed_at': -1,
            'all_modules.progress_percentage': -1,
          },
        },

        // Stage 8: Group again to get recent modules
        {
          $group: {
            _id: null,
            total_modules: { $first: '$total_modules' },
            completed_modules: { $first: '$completed_modules' },
            in_progress_modules: { $first: '$in_progress_modules' },
            not_started_modules: { $first: '$not_started_modules' },
            overall_progress_percentage: {
              $first: '$overall_progress_percentage',
            },
            recent_modules: { $push: '$all_modules' },
          },
        },

        // Stage 9: Project final structure
        {
          $project: {
            _id: 0,
            total_modules: 1,
            completed_modules: 1,
            in_progress_modules: 1,
            not_started_modules: 1,
            overall_progress_percentage: 1,
            recent_modules: { $slice: ['$recent_modules', 5] },
          },
        },
      ];

      // Execute aggregation
      const result = await ModuleModel.aggregate(pipeline);

      if (result.length === 0) {
        // No modules found, return empty overview
        return {
          message: this.errorMessageService.getSuccessMessageWithLanguage(
            'MODULE',
            'MODULE_OVERVIEW_RETRIEVED_SUCCESSFULLY',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
          data: {
            total_modules: 0,
            completed_modules: 0,
            in_progress_modules: 0,
            not_started_modules: 0,
            overall_progress_percentage: 0,
            recent_modules: [],
          },
        };
      }

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'MODULE',
          'MODULE_OVERVIEW_RETRIEVED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: result[0],
      };
    } catch (error) {
      this.logger.error('Error getting module overview', error?.stack || error);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'MODULE',
          'RETRIEVE_MODULE_OVERVIEW_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  /**
   * Get modules from Python service
   */
  async getModulesFromPythonService() {
    try {
      this.logger.log('Fetching modules from Python service');
      const response = await this.pythonService.getModules();
      this.logger.log('Successfully fetched modules from Python service');
      return response;
    } catch (error) {
      this.logger.error(
        'Error fetching modules from Python service',
        error?.stack || error,
      );
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'MODULE',
          'PYTHON_SERVICE_FETCH_FAILED',
          LanguageEnum.ENGLISH, // Default to English for now
        ),
      );
    }
  }

  /**
   * Update module sequence with automatic reordering
   */
  async updateModuleSequence(
    moduleId: string,
    newSequence: number,
    user: JWTUserPayload,
    schoolId?: string,
  ) {
    const resolvedSchoolId = this.resolveSchoolId(user, schoolId);
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'SCHOOL_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
    const tenantConnection = await this.tenantConnectionService.getTenantConnection(school.db_name);
    const moduleModel = tenantConnection.model('Module', ModuleSchema);

    // Validate module exists and is not soft deleted
    const module = await moduleModel.findOne({
      _id: new Types.ObjectId(moduleId),
      deleted_at: null,
    });

    if (!module) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'MODULE',
          'MODULE_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const currentSequence = module.sequence;

    // If sequence is the same, no need to update
    if (currentSequence === newSequence) {
      return {
        module_id: moduleId,
        sequence: newSequence,
        success: true,
        message: 'Module sequence unchanged',
      };
    }

    // Get all modules in the same year and school, excluding soft deleted ones and current module
    const allModules = await moduleModel
      .find({
        year: module.year,
        deleted_at: null,
        _id: { $ne: new Types.ObjectId(moduleId) },
      })
      .sort({ sequence: 1, created_at: 1 });

    // Check if the new sequence already exists in this year
    const existingModuleWithSequence = allModules.find(m => m.sequence === newSequence);
    if (existingModuleWithSequence) {
      this.logger.log(
        `Sequence ${newSequence} already exists for year ${module.year}, will reorder other modules`,
      );
    }

    // Handle sequence reordering
    const reorderedModules = this.reorderModuleSequences(
      allModules,
      newSequence,
      currentSequence,
    );

    // Update all affected modules
    const updatePromises = reorderedModules.map((mod) =>
      moduleModel.updateOne(
        { _id: mod._id },
        { sequence: mod.sequence },
      ),
    );

    // Update the target module
    updatePromises.push(
      moduleModel.updateOne(
        { _id: new Types.ObjectId(moduleId) },
        { sequence: newSequence },
      ),
    );

    await Promise.all(updatePromises);

    this.logger.log(
      `Module ${moduleId} sequence updated from ${currentSequence} to ${newSequence}`,
    );

    return {
      module_id: moduleId,
      sequence: newSequence,
      success: true,
      message: 'Module sequence updated successfully',
    };
  }

  /**
   * Bulk update module sequences
   */
  async bulkUpdateModuleSequences(
    updates: Array<{ module_id: string; sequence: number }>,
    user: JWTUserPayload,
    schoolId?: string,
  ) {
    const resolvedSchoolId = this.resolveSchoolId(user, schoolId);
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'SCHOOL_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
    const tenantConnection = await this.tenantConnectionService.getTenantConnection(school.db_name);
    const moduleModel = tenantConnection.model('Module', ModuleSchema);

    const results: Array<{ module_id: string; sequence: number; success: boolean; error?: string }> = [];
    let successfulUpdates = 0;
    let failedUpdates = 0;

    for (const update of updates) {
      try {
        const result = await this.updateModuleSequence(
          update.module_id,
          update.sequence,
          user,
          schoolId,
        );
        results.push({
          module_id: update.module_id,
          sequence: update.sequence,
          success: true,
        });
        successfulUpdates++;
      } catch (error) {
        results.push({
          module_id: update.module_id,
          sequence: update.sequence,
          success: false,
          error: error.message,
        });
        failedUpdates++;
      }
    }

    return {
      results,
      total_processed: updates.length,
      successful_updates: successfulUpdates,
      failed_updates: failedUpdates,
    };
  }


  /**
   * Handle sequence reordering when a module is soft deleted
   */
  async handleModuleSoftDelete(moduleId: string, user: JWTUserPayload, schoolId?: string) {
    const resolvedSchoolId = this.resolveSchoolId(user, schoolId);
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'SCHOOL_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
    const tenantConnection = await this.tenantConnectionService.getTenantConnection(school.db_name);
    const moduleModel = tenantConnection.model('Module', ModuleSchema);

    // Get the deleted module to find its sequence
    const deletedModule = await moduleModel.findOne({
      _id: new Types.ObjectId(moduleId),
      deleted_at: { $ne: null }, // Only get soft deleted modules
    });

    if (!deletedModule || !deletedModule.sequence) {
      // Module doesn't have a sequence, no reordering needed
      return;
    }

    const deletedSequence = deletedModule.sequence;

    // Get all modules in the same year with sequence higher than the deleted one
    const modulesToReorder = await moduleModel.find({
      year: deletedModule.year,
      deleted_at: null,
      sequence: { $gt: deletedSequence },
    }).sort({ sequence: 1 });

    // Decrease sequence by 1 for all modules after the deleted one
    const updatePromises = modulesToReorder.map((module) =>
      moduleModel.updateOne(
        { _id: module._id },
        { sequence: module.sequence - 1 },
      ),
    );

    await Promise.all(updatePromises);

    this.logger.log(
      `Reordered sequences after soft deleting module ${moduleId} with sequence ${deletedSequence}`,
    );
  }

  /**
   * Helper method to find the next available sequence after the highest completed
   * This handles gaps in sequence caused by unpublished modules
   */
  private findNextAvailableSequence(
    allModules: any[],
    highestCompletedSequence: number,
  ): number {
    if (highestCompletedSequence === 0) {
      // No modules completed yet, return the lowest sequence
      return allModules.length > 0 ? Math.min(...allModules.map(m => m.sequence)) : 1;
    }

    // Find all sequences that are greater than the highest completed
    const availableSequences = allModules
      .map(m => m.sequence)
      .filter(seq => seq > highestCompletedSequence)
      .sort((a, b) => a - b);

    if (availableSequences.length === 0) {
      // No more modules available, return a high number to lock everything
      return 999999;
    }

    // Return the next available sequence
    return availableSequences[0];
  }

  /**
   * Helper method to reorder module sequences
   */
  private reorderModuleSequences(
    modules: any[],
    newSequence: number,
    currentSequence: number,
  ) {
    const reorderedModules = [...modules];

    if (currentSequence === null) {
      // Module doesn't have a sequence yet, insert it
      reorderedModules.forEach((module, index) => {
        if (module.sequence >= newSequence) {
          module.sequence = module.sequence + 1;
        }
      });
    } else if (newSequence > currentSequence) {
      // Moving down in sequence
      reorderedModules.forEach((module) => {
        if (
          module.sequence > currentSequence &&
          module.sequence <= newSequence
        ) {
          module.sequence = module.sequence - 1;
        }
      });
    } else if (newSequence < currentSequence) {
      // Moving up in sequence
      reorderedModules.forEach((module) => {
        if (
          module.sequence >= newSequence &&
          module.sequence < currentSequence
        ) {
          module.sequence = module.sequence + 1;
        }
      });
    }

    return reorderedModules;
  }
}
