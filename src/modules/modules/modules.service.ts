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
import { ModuleFilterDto } from './dto/module-filter.dto';
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
  ModuleVisibilityActionEnum,
  MODULE_CONSTANTS,
} from 'src/common/constants/module.constant';
import { NotificationsService } from '../notifications/notifications.service';

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
  ) {}

  async createModule(createModuleDto: CreateModuleDto, user: JWTUserPayload) {
    const {
      title,
      subject,
      description,
      category,
      duration,
      difficulty,
      tags,
      thumbnail,
    } = createModuleDto;

    this.logger.log(`Creating module: ${title} by user: ${user.id}`);

    // Validate school exists and user has access
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);

    try {
      // Create module in tenant database
      const newModule = new ModuleModel({
        title,
        subject,
        description,
        category,
        duration,
        difficulty,
        tags: tags || [],
        thumbnail: thumbnail || '/uploads/default-module-thumbnail.jpg',
        created_by: new Types.ObjectId(user.id),
        created_by_role: user.role.name as RoleEnum,
      });

      const savedModule = await newModule.save();

      this.logger.log(`Module created in tenant DB: ${savedModule._id}`);

      return {
        message: 'Module created successfully',
        data: {
          id: savedModule._id,
          title: savedModule.title,
          subject: savedModule.subject,
          description: savedModule.description,
          category: savedModule.category,
          duration: savedModule.duration,
          difficulty: savedModule.difficulty,
          tags: savedModule.tags,
          created_by: savedModule.created_by,
          created_by_role: savedModule.created_by_role,
          created_at: savedModule.created_at,
          updated_at: savedModule.updated_at,
        },
      };
    } catch (error) {
      this.logger.error('Error creating module', error?.stack || error);
      throw new BadRequestException('Failed to create module');
    }
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
      throw new NotFoundException('School not found');
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
        pipeline.push({
          $match: { published: true },
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
      pipeline.push({
        $addFields: {
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
        },
      });

      // Stage 6: Sort
      let sortStage: any = { created_at: -1 }; // default sort

      if (filterDto?.sortBy) {
        const sortOrder = filterDto.sortOrder === 'desc' ? -1 : 1;

        switch (filterDto.sortBy) {
          case 'title':
            sortStage = { title_lower: sortOrder };
            break;
          case 'difficulty':
            sortStage = { difficulty_order: sortOrder };
            break;
          case 'duration':
            sortStage = { duration: sortOrder };
            break;
          case 'created_at':
            sortStage = { created_at: sortOrder };
            break;
          default:
            sortStage = { created_at: -1 };
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
      pipeline.push({
        $project: {
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
          created_by: 1,
          created_by_role: 1,
          created_at: 1,
          updated_at: 1,
        },
      });

      // Execute aggregation
      const modules = await ModuleModel.aggregate(pipeline);

      // Create pagination result
      const result = createPaginationResult(modules, total, paginationOptions);

      return {
        message: 'Modules retrieved successfully',
        data: result.data,
        pagination_data: result.pagination_data,
      };
    } catch (error) {
      this.logger.error('Error finding modules', error?.stack || error);
      throw new BadRequestException('Failed to retrieve modules');
    }
  }

  async findModuleById(id: string | Types.ObjectId, user: JWTUserPayload) {
    this.logger.log(`Finding module by id: ${id} for user: ${user.id}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);

    try {
      const module = await ModuleModel.findOne({
        _id: id,
        deleted_at: null,
      }).lean();

      if (!module) {
        throw new NotFoundException('Module not found');
      }

      // Attach user details to module
      const moduleWithUser = await attachUserDetailsToEntity(
        module,
        this.userModel,
      );

      return {
        message: 'Module retrieved successfully',
        data: moduleWithUser,
      };
    } catch (error) {
      this.logger.error('Error finding module', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve module');
    }
  }

  async updateModule(
    id: Types.ObjectId,
    updateModuleDto: UpdateModuleDto,
    user: JWTUserPayload,
  ) {
    this.logger.log(`Updating module: ${id} by user: ${user.id}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);

    try {
      const updatedModule = await ModuleModel.findOneAndUpdate(
        { _id: id, deleted_at: null },
        { ...updateModuleDto, updated_at: new Date() },
        { new: true },
      ).lean();

      if (!updatedModule) {
        throw new NotFoundException('Module not found');
      }

      // Attach user details to module
      const moduleWithUser = await attachUserDetailsToEntity(
        updatedModule,
        this.userModel,
      );

      return {
        message: 'Module updated successfully',
        data: moduleWithUser,
      };
    } catch (error) {
      this.logger.error('Error updating module', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update module');
    }
  }

  async removeModule(id: Types.ObjectId, user: JWTUserPayload) {
    this.logger.log(`Removing module: ${id} by user: ${user.id}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);

    try {
      const deletedModule = await ModuleModel.findOneAndUpdate(
        { _id: id, deleted_at: null },
        { deleted_at: new Date() },
        { new: true },
      );

      if (!deletedModule) {
        throw new NotFoundException('Module not found');
      }

      return {
        message: 'Module deleted successfully',
        data: { id: deletedModule._id },
      };
    } catch (error) {
      this.logger.error('Error removing module', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete module');
    }
  }

  async toggleModuleVisibility(
    publishModuleDto: ToggleModuleVisibilityDto,
    user: JWTUserPayload,
  ) {
    const { module_id, action } = publishModuleDto;

    this.logger.log(`${action} module: ${module_id} by user: ${user.id}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
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
        throw new NotFoundException('Module not found');
      }

      if (action === ModuleVisibilityActionEnum.PUBLISH) {
        // Check if module is already published
        if (module.published) {
          throw new BadRequestException('Module is already published');
        }

        // Check if module has at least one chapter
        const chapters = await ChapterModel.find({
          module_id: new Types.ObjectId(module_id),
          deleted_at: null,
        }).lean();

        if (chapters.length < MODULE_CONSTANTS.MIN_CHAPTERS_REQUIRED) {
          throw new BadRequestException(
            `Module must have at least ${MODULE_CONSTANTS.MIN_CHAPTERS_REQUIRED} chapter to be published.`,
          );
        }

        // Check if module has at least one quiz group
        const quizGroups = await QuizGroupModel.find({
          module_id: new Types.ObjectId(module_id),
          deleted_at: null,
        }).lean();

        if (quizGroups.length < MODULE_CONSTANTS.MIN_QUIZ_GROUPS_REQUIRED) {
          throw new BadRequestException(
            `Module must have at least ${MODULE_CONSTANTS.MIN_QUIZ_GROUPS_REQUIRED} quiz group to be published.`,
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
          throw new NotFoundException('Module not found');
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
          message: 'Module published successfully',
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
          throw new BadRequestException('Module is already unpublished');
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
          throw new NotFoundException('Module not found');
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
          message: 'Module unpublished successfully',
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
          'Invalid action. Must be PUBLISH or UNPUBLISH',
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
      throw new BadRequestException(`Failed to ${action.toLowerCase()} module`);
    }
  }
}
