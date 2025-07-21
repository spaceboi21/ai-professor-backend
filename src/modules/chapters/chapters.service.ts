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

import { BibliographyTypeEnum } from 'src/common/constants/bibliography-type.constant';
import { ProgressStatusEnum } from 'src/common/constants/status.constant';
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
          'School ID is required in request body for super admin',
        );
      }
      return bodySchoolId.toString();
    } else {
      // For other roles, use school_id from user context
      if (!user.school_id) {
        throw new BadRequestException('User school ID not found');
      }
      return user.school_id.toString();
    }
  }

  /**
   * Helper method to check if a chapter title already exists in the same module
   * @param module_id - The module ID
   * @param title - The chapter title to check
   * @param excludeChapterId - Optional chapter ID to exclude from check (for updates)
   * @param user - User context for tenant connection
   * @returns Promise<boolean> - true if title exists, false otherwise
   */
  private async checkChapterTitleExists(
    module_id: string | Types.ObjectId,
    title: string,
    user: JWTUserPayload,
    excludeChapterId?: string | Types.ObjectId,
  ): Promise<boolean> {
    // Validate school
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ChapterModel = tenantConnection.model(Chapter.name, ChapterSchema);

    // Normalize input title (trim + lowercase)
    const normalizedTitle = title.trim().toLowerCase();

    // Build case-insensitive query using aggregation expression
    const query: any = {
      module_id: new Types.ObjectId(module_id.toString()),
      deleted_at: null,
      $expr: {
        $eq: [{ $toLower: '$title' }, normalizedTitle],
      },
    };

    // Exclude the chapter being updated
    if (excludeChapterId) {
      query._id = { $ne: new Types.ObjectId(excludeChapterId.toString()) };
    }

    const exists = await ChapterModel.exists(query);
    return !!exists;
  }

  async createChapter(
    createChapterDto: CreateChapterDto,
    user: JWTUserPayload,
  ) {
    const { school_id, module_id, title, description } = createChapterDto;

    this.logger.log(
      `Creating chapter: ${title} for module: ${module_id} by user: ${user.id}`,
    );

    // Resolve school_id based on user role
    const resolvedSchoolId = this.resolveSchoolId(user, school_id);

    // Validate school exists and user has access
    const school = await this.schoolModel.findById(resolvedSchoolId);
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

      // Check if another chapter with the same (trimmed, case-insensitive) title exists in this module
      const titleExists = await this.checkChapterTitleExists(
        module_id,
        title,
        user,
      );

      if (titleExists) {
        throw new ConflictException(
          `Chapter with title "${title.trim()}" already exists in this module`,
        );
      }

      // Get next sequence number for this module
      const nextSequence = await this.getNextSequence(module_id, user);
      // Create chapter in tenant database
      const newChapter = new ChapterModel({
        module_id: new Types.ObjectId(module_id),
        title,
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
    module_id?: string | Types.ObjectId,
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
      // Get pagination options
      const paginationOptions = getPaginationOptions(paginationDto || {});

      // Build aggregation pipeline
      const pipeline: any[] = [
        // Stage 1: Match chapters that are not deleted
        { $match: { deleted_at: null } },
      ];

      // Stage 2: Add module filter if provided
      if (module_id) {
        pipeline.push({
          $match: { module_id: new Types.ObjectId(module_id.toString()) },
        });
      }

      // Stage 3: Add content information for all users
      // Lookup bibliography items
      pipeline.push({
        $lookup: {
          from: 'bibliographies',
          let: { chapterId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$chapter_id', '$$chapterId'] },
                    { $eq: ['$deleted_at', null] },
                  ],
                },
              },
            },
          ],
          as: 'bibliography',
        },
      });

      // Lookup quiz groups
      pipeline.push({
        $lookup: {
          from: 'quiz_group',
          let: { chapterId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$chapter_id', '$$chapterId'] },
                    { $eq: ['$deleted_at', null] },
                  ],
                },
              },
            },
          ],
          as: 'quiz_groups',
        },
      });

      // Stage 4: Add computed fields for all users
      const addFieldsStage: any = {
        // Check for video content
        hasVideo: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: '$bibliography',
                  cond: { $eq: ['$$this.type', BibliographyTypeEnum.VIDEO] },
                },
              },
            },
            0,
          ],
        },
        // Check for ppt content
        hasPpt: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: '$bibliography',
                  cond: {
                    $eq: ['$$this.type', BibliographyTypeEnum.POWERPOINT],
                  },
                },
              },
            },
            0,
          ],
        },
        // Check for PDF content
        hasPdf: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: '$bibliography',
                  cond: { $eq: ['$$this.type', BibliographyTypeEnum.PDF] },
                },
              },
            },
            0,
          ],
        },
        // Check for quiz content
        hasQuiz: { $gt: [{ $size: '$quiz_groups' }, 0] },
        // Get bibliography count
        bibliography_count: { $size: '$bibliography' },
        // Get quiz count
        quiz_count: { $size: '$quiz_groups' },
      };

      // Add student progress lookup and status field only for students
      if (user.role.name === RoleEnum.STUDENT) {
        // Lookup student progress
        pipeline.push({
          $lookup: {
            from: 'student_chapter_progress',
            let: { chapterId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$chapter_id', '$$chapterId'] },
                      { $eq: ['$student_id', new Types.ObjectId(user.id)] },
                    ],
                  },
                },
              },
            ],
            as: 'progress',
          },
        });

        // Add status field for students
        addFieldsStage.status = {
          $cond: {
            if: { $gt: [{ $size: '$progress' }, 0] },
            then: { $arrayElemAt: ['$progress.status', 0] },
            else: ProgressStatusEnum.NOT_STARTED,
          },
        };
      }

      pipeline.push({ $addFields: addFieldsStage });

      // Stage 5: Project final fields
      const projectFields: any = {
        _id: 1,
        module_id: 1,
        title: 1,
        description: 1,
        sequence: 1,
        created_by: 1,
        created_by_role: 1,
        created_at: 1,
        updated_at: 1,
        hasVideo: 1,
        hasPpt: 1,
        hasPdf: 1,
        hasQuiz: 1,
        bibliography_count: 1,
        quiz_count: 1,
      };

      // Add status field only for students
      if (user.role.name === RoleEnum.STUDENT) {
        projectFields.status = 1;
      }

      pipeline.push({ $project: projectFields });

      // Stage 6: Sort by sequence
      pipeline.push({ $sort: { sequence: 1 } });

      // Stage 7: Get total count for pagination
      const countPipeline = [...pipeline, { $count: 'total' }];
      const countResult = await ChapterModel.aggregate(countPipeline);
      const total = countResult.length > 0 ? countResult[0].total : 0;

      // Stage 8: Add pagination
      pipeline.push(
        { $skip: paginationOptions.skip },
        { $limit: paginationOptions.limit },
      );

      // Execute aggregation
      const chapters = await ChapterModel.aggregate(pipeline);

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
      // Build aggregation pipeline
      const pipeline: any[] = [
        // Stage 1: Match the specific chapter
        {
          $match: {
            _id: new Types.ObjectId(id.toString()),
            deleted_at: null,
          },
        },
      ];

      // Stage 2: Add content information for all users
      // Lookup bibliography items
      pipeline.push({
        $lookup: {
          from: 'bibliographies',
          let: { chapterId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$chapter_id', '$$chapterId'] },
                    { $eq: ['$deleted_at', null] },
                  ],
                },
              },
            },
          ],
          as: 'bibliography',
        },
      });

      // Lookup quiz groups
      pipeline.push({
        $lookup: {
          from: 'quiz_group',
          let: { chapterId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$chapter_id', '$$chapterId'] },
                    { $eq: ['$deleted_at', null] },
                  ],
                },
              },
            },
          ],
          as: 'quiz_groups',
        },
      });

      // Stage 3: Add computed fields for all users
      const addFieldsStage: any = {
        // Check for video content
        hasVideo: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: '$bibliography',
                  cond: {
                    $eq: ['$$this.type', BibliographyTypeEnum.VIDEO],
                  },
                },
              },
            },
            0,
          ],
        },
        // Check for video content
        hasPpt: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: '$bibliography',
                  cond: {
                    $eq: ['$$this.type', BibliographyTypeEnum.POWERPOINT],
                  },
                },
              },
            },
            0,
          ],
        },
        // Check for PDF content
        hasPdf: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: '$bibliography',
                  cond: { $eq: ['$$this.type', BibliographyTypeEnum.PDF] },
                },
              },
            },
            0,
          ],
        },
        // Check for quiz content
        hasQuiz: { $gt: [{ $size: '$quiz_groups' }, 0] },
        // Get bibliography count
        bibliography_count: { $size: '$bibliography' },
        // Get quiz count
        quiz_count: { $size: '$quiz_groups' },
      };

      // Add student progress lookup and status field only for students
      if (user.role.name === RoleEnum.STUDENT) {
        // Lookup student progress
        pipeline.push({
          $lookup: {
            from: 'student_chapter_progress',
            let: { chapterId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$chapter_id', '$$chapterId'] },
                      { $eq: ['$student_id', new Types.ObjectId(user.id)] },
                    ],
                  },
                },
              },
            ],
            as: 'progress',
          },
        });

        // Add status field for students
        addFieldsStage.status = {
          $cond: {
            if: { $gt: [{ $size: '$progress' }, 0] },
            then: { $arrayElemAt: ['$progress.status', 0] },
            else: ProgressStatusEnum.NOT_STARTED,
          },
        };
      }

      pipeline.push({ $addFields: addFieldsStage });

      // Stage 4: Project final fields
      const projectFields: any = {
        _id: 1,
        module_id: 1,
        title: 1,
        description: 1,
        sequence: 1,
        created_by: 1,
        created_by_role: 1,
        created_at: 1,
        updated_at: 1,
        hasVideo: 1,
        hasPpt: 1,
        hasPdf: 1,
        hasQuiz: 1,
        bibliography_count: 1,
        quiz_count: 1,
      };

      // Add status field only for students
      if (user.role.name === RoleEnum.STUDENT) {
        projectFields.status = 1;
      }

      pipeline.push({ $project: projectFields });

      // Execute aggregation
      const chapters = await ChapterModel.aggregate(pipeline);

      if (chapters.length === 0) {
        throw new NotFoundException('Chapter not found');
      }

      const chapter = chapters[0];

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
    const { school_id, ...chapterUpdateData } = updateChapterDto;

    this.logger.log(`Updating chapter: ${id} by user: ${user.id}`);

    // Resolve school_id based on user role
    const resolvedSchoolId = this.resolveSchoolId(user, school_id);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ChapterModel = tenantConnection.model(Chapter.name, ChapterSchema);

    try {
      // If title is being updated, check for duplicates
      if (chapterUpdateData.title) {
        // Get the current chapter to retrieve module_id
        const currentChapter = await ChapterModel.findOne({
          _id: id,
          deleted_at: null,
        });

        if (!currentChapter) {
          throw new NotFoundException('Chapter not found');
        }

        // Check if another chapter with the same (trimmed, case-insensitive) title exists in this module
        const titleExists = await this.checkChapterTitleExists(
          currentChapter.module_id,
          chapterUpdateData.title,
          user,
          id, // Exclude current chapter from duplicate check
        );

        if (titleExists) {
          throw new ConflictException(
            `Chapter with title "${chapterUpdateData.title.trim()}" already exists in this module`,
          );
        }
      }

      const updatedChapter = await ChapterModel.findOneAndUpdate(
        { _id: id, deleted_at: null },
        {
          title: chapterUpdateData.title,
          ...chapterUpdateData,
          updated_at: new Date(),
        },
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

  async removeChapter(
    id: string | Types.ObjectId,
    user: JWTUserPayload,
    school_id?: string,
  ) {
    this.logger.log(`Removing chapter: ${id} by user: ${user.id}`);

    // Resolve school_id based on user role
    const resolvedSchoolId = this.resolveSchoolId(user, school_id);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
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
    const { school_id, chapters } = reorderChaptersDto;

    if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
      throw new BadRequestException(
        'Chapters array is required and must not be empty',
      );
    }

    this.logger.log(`Reordering chapters by user: ${user.id}`);

    // Resolve school_id based on user role
    const resolvedSchoolId = this.resolveSchoolId(user, school_id);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
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
