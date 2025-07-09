import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  ConflictException,
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
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { ReorderChaptersDto } from './dto/reorder-chapters.dto';
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

@Injectable()
export class ChaptersService {
  private readonly logger = new Logger(ChaptersService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
  ) {}

  async createChapter(
    createChapterDto: CreateChapterDto,
    user: JWTUserPayload,
  ) {
    const { module_id, title, subject, description } = createChapterDto;

    this.logger.log(
      `Creating chapter: ${title} for module: ${module_id} by user: ${user.id}`,
    );

    // Validate school exists and user has access
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ChapterModel = tenantConnection.model(Chapter.name, ChapterSchema);
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);

    try {
      // Validate module exists
      const module = await ModuleModel.findOne({
        _id: module_id,
        deleted_at: null,
      });
      if (!module) {
        throw new NotFoundException('Module not found');
      }

      // Get next sequence number for this module
      const nextSequence = await this.getNextSequence(module_id, user);
      // Create chapter in tenant database
      const newChapter = new ChapterModel({
        module_id: new Types.ObjectId(module_id),
        title,
        subject,
        description,
        sequence: nextSequence,
        created_by: new Types.ObjectId(user.id),
        created_by_role: user.role.name as RoleEnum,
      });

      const savedChapter = await newChapter.save();

      this.logger.log(`Chapter created in tenant DB: ${savedChapter._id}`);

      return {
        message: 'Chapter created successfully',
        data: savedChapter,
      };
    } catch (error) {
      this.logger.error('Error creating chapter', error?.stack || error);
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to create chapter');
    }
  }

  async findAllChapters(
    user: JWTUserPayload,
    module_id?: Types.ObjectId,
    paginationDto?: PaginationDto,
  ) {
    this.logger.log(
      `Finding chapters for user: ${user.id}${module_id ? ` in module: ${module_id}` : ''}`,
    );

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ChapterModel = tenantConnection.model(Chapter.name, ChapterSchema);

    try {
      const query: any = { deleted_at: null };
      if (module_id) {
        query.module_id = module_id;
      }

      // Get pagination options
      const paginationOptions = getPaginationOptions(paginationDto || {});

      // Get total count for pagination
      const total = await ChapterModel.countDocuments(query);

      // Get paginated chapters
      const chapters = await ChapterModel.find(query)
        .sort({ sequence: 1 })
        .skip(paginationOptions.skip)
        .limit(paginationOptions.limit)
        .lean();

      // Attach user details to chapters
      const chaptersWithUsers = await attachUserDetails(
        chapters,
        this.userModel,
      );

      // Create pagination result
      const result = createPaginationResult(
        chaptersWithUsers,
        total,
        paginationOptions,
      );

      return {
        message: 'Chapters retrieved successfully',
        data: result.data,
        pagination_data: result.pagination_data,
      };
    } catch (error) {
      this.logger.error('Error finding chapters', error?.stack || error);
      throw new BadRequestException('Failed to retrieve chapters');
    }
  }

  async findChapterById(id: string | Types.ObjectId, user: JWTUserPayload) {
    this.logger.log(`Finding chapter by id: ${id} for user: ${user.id}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ChapterModel = tenantConnection.model(Chapter.name, ChapterSchema);

    try {
      const chapter = await ChapterModel.findOne({
        _id: id,
        deleted_at: null,
      }).lean();

      if (!chapter) {
        throw new NotFoundException('Chapter not found');
      }

      // Attach user details to chapter
      const chapterWithUser = await attachUserDetailsToEntity(
        chapter,
        this.userModel,
      );

      return {
        message: 'Chapter retrieved successfully',
        data: chapterWithUser,
      };
    } catch (error) {
      this.logger.error('Error finding chapter', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve chapter');
    }
  }

  async updateChapter(
    id: string | Types.ObjectId,
    updateChapterDto: UpdateChapterDto,
    user: JWTUserPayload,
  ) {
    this.logger.log(`Updating chapter: ${id} by user: ${user.id}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ChapterModel = tenantConnection.model(Chapter.name, ChapterSchema);

    try {
      const updatedChapter = await ChapterModel.findOneAndUpdate(
        { _id: id, deleted_at: null },
        { ...updateChapterDto, updated_at: new Date() },
        { new: true },
      ).lean();

      if (!updatedChapter) {
        throw new NotFoundException('Chapter not found');
      }

      // Attach user details to chapter
      const chapterWithUser = await attachUserDetailsToEntity(
        updatedChapter,
        this.userModel,
      );

      return {
        message: 'Chapter updated successfully',
        data: chapterWithUser,
      };
    } catch (error) {
      this.logger.error('Error updating chapter', error?.stack || error);
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to update chapter');
    }
  }

  async removeChapter(id: string | Types.ObjectId, user: JWTUserPayload) {
    this.logger.log(`Removing chapter: ${id} by user: ${user.id}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ChapterModel = tenantConnection.model(Chapter.name, ChapterSchema);

    try {
      const deletedChapter = await ChapterModel.findOneAndUpdate(
        { _id: id, deleted_at: null },
        { deleted_at: new Date() },
        { new: true },
      );

      if (!deletedChapter) {
        throw new NotFoundException('Chapter not found');
      }

      return {
        message: 'Chapter deleted successfully',
        data: { id: deletedChapter._id },
      };
    } catch (error) {
      this.logger.error('Error removing chapter', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete chapter');
    }
  }

  async reorderChapters(
    reorderChaptersDto: ReorderChaptersDto,
    user: JWTUserPayload,
  ) {
    const { chapters } = reorderChaptersDto;

    if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
      throw new BadRequestException(
        'Chapters array is required and must not be empty',
      );
    }

    this.logger.log(`Reordering chapters by user: ${user.id}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ChapterModel = tenantConnection.model(Chapter.name, ChapterSchema);

    try {
      // Validate all chapters exist and belong to the same module
      const chapterIds = chapters.map((c) => c.chapter_id);
      const existingChapters = await ChapterModel.find({
        _id: { $in: chapterIds },
        deleted_at: null,
      }).lean();

      if (existingChapters.length !== chapters.length) {
        throw new NotFoundException('One or more chapters not found');
      }

      // Check if all chapters belong to the same module
      const moduleIds = [
        ...new Set(existingChapters.map((c) => c.module_id.toString())),
      ];
      if (moduleIds.length > 1) {
        throw new BadRequestException(
          'All chapters must belong to the same module',
        );
      }

      // Check for duplicate sequences
      const sequences = chapters.map((c) => c.new_sequence);
      const uniqueSequences = [...new Set(sequences)];
      if (sequences.length !== uniqueSequences.length) {
        throw new BadRequestException(
          'Duplicate sequence numbers are not allowed',
        );
      }

      // Use a transaction to ensure atomic updates and avoid conflicts
      const session = await tenantConnection.startSession();

      try {
        await session.withTransaction(async () => {
          // First, temporarily set all sequences to negative values to avoid conflicts
          for (const chapter of chapters) {
            await ChapterModel.findByIdAndUpdate(
              chapter.chapter_id,
              { sequence: -chapter.new_sequence, updated_at: new Date() },
              { session, new: true },
            );
          }

          // Then, set the final sequences
          for (const chapter of chapters) {
            await ChapterModel.findByIdAndUpdate(
              chapter.chapter_id,
              { sequence: chapter.new_sequence, updated_at: new Date() },
              { session, new: true },
            );
          }
        });

        // Fetch the updated chapters
        const updatedChapters = await ChapterModel.find({
          _id: { $in: chapters.map((c) => c.chapter_id) },
          deleted_at: null,
        }).lean();

        return {
          message: 'Chapters reordered successfully',
          data: updatedChapters
            .filter((chapter) => chapter !== null)
            .map((chapter) => ({
              id: chapter._id,
              title: chapter.title,
              sequence: chapter.sequence,
            })),
        };
      } catch (error) {
        this.logger.error('Error reordering chapters', error?.stack || error);
        if (
          error instanceof NotFoundException ||
          error instanceof BadRequestException
        ) {
          throw error;
        }
        throw new BadRequestException('Failed to reorder chapters');
      } finally {
        await session.endSession();
      }
    } catch (error) {
      this.logger.error('Error reordering chapters', error?.stack || error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to reorder chapters');
    }
  }

  async getNextSequence(
    module_id: string | Types.ObjectId,
    user: JWTUserPayload,
  ): Promise<number> {
    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ChapterModel = tenantConnection.model(Chapter.name, ChapterSchema);

    try {
      const lastChapter = await ChapterModel.findOne({
        module_id: new Types.ObjectId(module_id),
        deleted_at: null,
      })
        .sort({ sequence: -1 })
        .select('sequence')
        .lean();
      return lastChapter ? lastChapter.sequence + 1 : 1;
    } catch (error) {
      this.logger.error('Error getting next sequence', error?.stack || error);
      throw new BadRequestException('Failed to get next sequence');
    }
  }
}
