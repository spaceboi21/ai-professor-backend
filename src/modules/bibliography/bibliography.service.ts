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
import {
  Bibliography,
  BibliographySchema,
} from 'src/database/schemas/tenant/bibliography.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { CreateBibliographyDto } from './dto/create-bibliography.dto';
import { UpdateBibliographyDto } from './dto/update-bibliography.dto';
import { BibliographyFilterDto } from './dto/bibliography-filter.dto';
import { ReorderBibliographyItemsDto } from './dto/reorder-bibliography.dto';
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
export class BibliographyService {
  private readonly logger = new Logger(BibliographyService.name);

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

  async createBibliography(
    createBibliographyDto: CreateBibliographyDto,
    user: JWTUserPayload,
  ) {
    const {
      school_id,
      module_id,
      chapter_id,
      title,
      description,
      type,
      mime_type,
      path,
      pages,
      duration,
    } = createBibliographyDto;

    this.logger.log(`Creating bibliography: ${title} by user: ${user.id}`);

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
    const BibliographyModel = tenantConnection.model(
      Bibliography.name,
      BibliographySchema,
    );
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);
    const ChapterModel = tenantConnection.model(Chapter.name, ChapterSchema);

    try {
      // Validate module exists
      const module = await ModuleModel.findOne({
        _id: new Types.ObjectId(module_id),
        deleted_at: null,
      });
      if (!module) {
        throw new NotFoundException('Module not found');
      }

      // Validate chapter exists and belongs to the module
      const chapter = await ChapterModel.findOne({
        _id: new Types.ObjectId(chapter_id),
        module_id: new Types.ObjectId(module_id),
        deleted_at: null,
      });
      if (!chapter) {
        throw new NotFoundException(
          'Chapter not found or does not belong to the specified module',
        );
      }

      // Get next sequence number for this chapter
      const nextSequence = await this.getNextSequence(chapter_id, user);

      // Create bibliography in tenant database
      const newBibliography = new BibliographyModel({
        module_id: new Types.ObjectId(module_id),
        chapter_id: new Types.ObjectId(chapter_id),
        title,
        description,
        type,
        mime_type,
        path,
        pages,
        duration,
        sequence: nextSequence,
        created_by: new Types.ObjectId(user.id),
        created_by_role: user.role.name as RoleEnum,
      });

      const savedBibliography = await newBibliography.save();

      this.logger.log(
        `Bibliography created in tenant DB: ${savedBibliography._id}`,
      );

      return {
        message: 'Bibliography created successfully',
        data: savedBibliography,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error('Error creating bibliography', error?.stack || error);
      throw new BadRequestException('Failed to create bibliography');
    }
  }

  async findAllBibliography(
    user: JWTUserPayload,
    paginationDto?: PaginationDto,
    filterDto?: BibliographyFilterDto,
  ) {
    this.logger.log(`Finding bibliography for user: ${user.id}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const BibliographyModel = tenantConnection.model(
      Bibliography.name,
      BibliographySchema,
    );

    try {
      // Build query
      const query: any = { deleted_at: null };

      if (filterDto?.module_id) {
        query.module_id = new Types.ObjectId(filterDto.module_id);
      }

      if (filterDto?.chapter_id) {
        query.chapter_id = new Types.ObjectId(filterDto.chapter_id);
      }

      if (filterDto?.type) {
        query.type = filterDto.type;
      }

      // Get pagination options
      const paginationOptions = getPaginationOptions(paginationDto || {});

      // Build aggregation pipeline for fast query with text search
      const pipeline: any[] = [
        // Stage 1: Match documents that are not deleted
        { $match: { deleted_at: null } },
      ];

      // Stage 2: Add filters
      if (filterDto?.module_id) {
        pipeline.push({
          $match: { module_id: new Types.ObjectId(filterDto.module_id) },
        });
      }

      if (filterDto?.chapter_id) {
        pipeline.push({
          $match: { chapter_id: new Types.ObjectId(filterDto.chapter_id) },
        });
      }

      if (filterDto?.type) {
        pipeline.push({
          $match: { type: filterDto.type },
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

      // Stage 4: Add computed fields for better sorting
      pipeline.push({
        $addFields: {
          title_lower: { $toLower: '$title' },
          type_order: {
            $switch: {
              branches: [
                { case: { $eq: ['$type', 'PDF'] }, then: 1 },
                { case: { $eq: ['$type', 'VIDEO'] }, then: 2 },
                { case: { $eq: ['$type', 'SLIDE'] }, then: 3 },
                { case: { $eq: ['$type', 'CASE_STUDY'] }, then: 4 },
                { case: { $eq: ['$type', 'IMAGE'] }, then: 5 },
                { case: { $eq: ['$type', 'LINK'] }, then: 6 },
              ],
              default: 0,
            },
          },
        },
      });

      // Stage 5: Sort
      let sortStage: any = { sequence: 1 }; // default sort

      if (filterDto?.sortBy) {
        const sortOrder = filterDto.sortOrder === 'desc' ? -1 : 1;

        switch (filterDto.sortBy) {
          case 'title':
            sortStage = { title_lower: sortOrder };
            break;
          case 'type':
            sortStage = { type_order: sortOrder };
            break;
          case 'duration':
            sortStage = { duration: sortOrder };
            break;
          case 'sequence':
            sortStage = { sequence: sortOrder };
            break;
          case 'created_at':
            sortStage = { created_at: sortOrder };
            break;
          default:
            sortStage = { sequence: 1 };
        }
      }

      pipeline.push({ $sort: sortStage });

      // Stage 6: Get total count for pagination
      const countPipeline = [...pipeline, { $count: 'total' }];
      const countResult = await BibliographyModel.aggregate(countPipeline);
      const total = countResult.length > 0 ? countResult[0].total : 0;

      // Stage 7: Add pagination
      pipeline.push(
        { $skip: paginationOptions.skip },
        { $limit: paginationOptions.limit },
      );

      // Stage 8: Project final fields
      pipeline.push({
        $project: {
          _id: 1,
          module_id: 1,
          chapter_id: 1,
          title: 1,
          description: 1,
          type: 1,
          mime_type: 1,
          path: 1,
          pages: 1,
          duration: 1,
          sequence: 1,
          created_by: 1,
          created_by_role: 1,
          created_at: 1,
          updated_at: 1,
        },
      });

      // Execute aggregation
      const bibliography = await BibliographyModel.aggregate(pipeline);

      // Attach user details to bibliography
      const bibliographyWithUsers = await attachUserDetails(
        bibliography,
        this.userModel,
      );

      // Create pagination result
      const result = createPaginationResult(
        bibliographyWithUsers,
        total,
        paginationOptions,
      );

      return {
        message: 'Bibliography retrieved successfully',
        data: result.data,
        pagination_data: result.pagination_data,
      };
    } catch (error) {
      this.logger.error('Error finding bibliography', error?.stack || error);
      throw new BadRequestException('Failed to retrieve bibliography');
    }
  }

  async findBibliographyById(
    id: string | Types.ObjectId,
    user: JWTUserPayload,
  ) {
    this.logger.log(`Finding bibliography by id: ${id} for user: ${user.id}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const BibliographyModel = tenantConnection.model(
      Bibliography.name,
      BibliographySchema,
    );

    try {
      const bibliography = await BibliographyModel.findOne({
        _id: id,
        deleted_at: null,
      }).lean();

      if (!bibliography) {
        throw new NotFoundException('Bibliography not found');
      }

      // Attach user details
      const bibliographyWithUser = await attachUserDetailsToEntity(
        bibliography,
        this.userModel,
      );

      return {
        message: 'Bibliography retrieved successfully',
        data: bibliographyWithUser,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        'Error finding bibliography by id',
        error?.stack || error,
      );
      throw new BadRequestException('Failed to retrieve bibliography');
    }
  }

  async updateBibliography(
    id: string | Types.ObjectId,
    updateBibliographyDto: UpdateBibliographyDto,
    user: JWTUserPayload,
  ) {
    const { school_id, ...bibliographyUpdateData } = updateBibliographyDto;
    
    this.logger.log(`Updating bibliography: ${id} by user: ${user.id}`);

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
    const BibliographyModel = tenantConnection.model(
      Bibliography.name,
      BibliographySchema,
    );
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);
    const ChapterModel = tenantConnection.model(Chapter.name, ChapterSchema);

    try {
      // Check if bibliography exists
      const existingBibliography = await BibliographyModel.findOne({
        _id: id,
        deleted_at: null,
      });
      if (!existingBibliography) {
        throw new NotFoundException('Bibliography not found');
      }

      // Validate module if provided
      if (updateBibliographyDto.module_id) {
        const module = await ModuleModel.findOne({
          _id: updateBibliographyDto.module_id,
          deleted_at: null,
        });
        if (!module) {
          throw new NotFoundException('Module not found');
        }
      }

      // Validate chapter if provided
      if (updateBibliographyDto.chapter_id) {
        const chapter = await ChapterModel.findOne({
          _id: updateBibliographyDto.chapter_id,
          module_id:
            updateBibliographyDto.module_id || existingBibliography.module_id,
          deleted_at: null,
        });
        if (!chapter) {
          throw new NotFoundException(
            'Chapter not found or does not belong to the specified module',
          );
        }
      }

      // Update bibliography
      const updatedBibliography = await BibliographyModel.findByIdAndUpdate(
        id,
        {
          $set: {
            ...bibliographyUpdateData,
            ...(bibliographyUpdateData.module_id && {
              module_id: new Types.ObjectId(bibliographyUpdateData.module_id),
            }),
            ...(bibliographyUpdateData.chapter_id && {
              chapter_id: new Types.ObjectId(bibliographyUpdateData.chapter_id),
            }),
          },
        },
        { new: true },
      );

      if (!updatedBibliography) {
        throw new NotFoundException('Bibliography not found');
      }

      this.logger.log(`Bibliography updated: ${updatedBibliography._id}`);

      return {
        message: 'Bibliography updated successfully',
        data: {
          id: updatedBibliography._id,
          module_id: updatedBibliography.module_id,
          chapter_id: updatedBibliography.chapter_id,
          title: updatedBibliography.title,
          description: updatedBibliography.description,
          type: updatedBibliography.type,
          mime_type: updatedBibliography.mime_type,
          path: updatedBibliography.path,
          pages: updatedBibliography.pages,
          duration: updatedBibliography.duration,
          sequence: updatedBibliography.sequence,
          created_by: updatedBibliography.created_by,
          created_by_role: updatedBibliography.created_by_role,
          created_at: updatedBibliography.created_at,
          updated_at: updatedBibliography.updated_at,
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error('Error updating bibliography', error?.stack || error);
      throw new BadRequestException('Failed to update bibliography');
    }
  }

  async deleteBibliography(id: string | Types.ObjectId, user: JWTUserPayload, school_id?: string) {
    this.logger.log(`Deleting bibliography: ${id} by user: ${user.id}`);

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
    const BibliographyModel = tenantConnection.model(
      Bibliography.name,
      BibliographySchema,
    );

    try {
      // Check if bibliography exists
      const bibliography = await BibliographyModel.findOne({
        _id: id,
        deleted_at: null,
      });
      if (!bibliography) {
        throw new NotFoundException('Bibliography not found');
      }

      // Soft delete bibliography
      const deletedBibliography = await BibliographyModel.findByIdAndUpdate(
        id,
        {
          $set: {
            deleted_at: new Date(),
          },
        },
        { new: true },
      );

      if (!deletedBibliography) {
        throw new NotFoundException('Bibliography not found');
      }

      this.logger.log(`Bibliography deleted: ${deletedBibliography._id}`);

      return {
        message: 'Bibliography deleted successfully',
        data: {
          id: deletedBibliography._id,
          deleted_at: deletedBibliography.deleted_at,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error deleting bibliography', error?.stack || error);
      throw new BadRequestException('Failed to delete bibliography');
    }
  }

  async reorderBibliography(
    reorderBibliographyItemsDto: ReorderBibliographyItemsDto,
    user: JWTUserPayload,
  ) {
    const { school_id, bibliography_items } = reorderBibliographyItemsDto;

    if (
      !bibliography_items ||
      !Array.isArray(bibliography_items) ||
      bibliography_items.length === 0
    ) {
      throw new BadRequestException(
        'Bibliography items array is required and must not be empty',
      );
    }

    this.logger.log(`Reordering bibliography items by user: ${user.id}`);

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
    const BibliographyModel = tenantConnection.model(
      Bibliography.name,
      BibliographySchema,
    );

    try {
      // Validate all bibliography items exist and belong to the same chapter
      const bibliographyIds = bibliography_items.map((b) => b.bibliography_id);
      const existingBibliography = await BibliographyModel.find({
        _id: { $in: bibliographyIds },
        deleted_at: null,
      }).lean();

      if (existingBibliography.length !== bibliography_items.length) {
        throw new NotFoundException('One or more bibliography items not found');
      }

      // Check if all bibliography items belong to the same chapter
      const chapterIds = [
        ...new Set(existingBibliography.map((b) => b.chapter_id.toString())),
      ];
      if (chapterIds.length > 1) {
        throw new BadRequestException(
          'All bibliography items must belong to the same chapter',
        );
      }

      // Check for duplicate sequences
      const sequences = bibliography_items.map((b) => b.new_sequence);
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
          for (const bibliographyItem of bibliography_items) {
            await BibliographyModel.findByIdAndUpdate(
              bibliographyItem.bibliography_id,
              {
                sequence: -bibliographyItem.new_sequence,
                updated_at: new Date(),
              },
              { session, new: true },
            );
          }

          // Then, set the final sequences
          for (const bibliographyItem of bibliography_items) {
            await BibliographyModel.findByIdAndUpdate(
              bibliographyItem.bibliography_id,
              {
                sequence: bibliographyItem.new_sequence,
                updated_at: new Date(),
              },
              { session, new: true },
            );
          }
        });

        // Fetch the updated bibliography items
        const updatedBibliography = await BibliographyModel.find({
          _id: { $in: bibliography_items.map((b) => b.bibliography_id) },
          deleted_at: null,
        }).lean();

        return {
          message: 'Bibliography items reordered successfully',
          data: updatedBibliography
            .filter((bibliography) => bibliography !== null)
            .map((bibliography) => ({
              id: bibliography._id,
              title: bibliography.title,
              sequence: bibliography.sequence,
            })),
        };
      } catch (error) {
        this.logger.error(
          'Error reordering bibliography items',
          error?.stack || error,
        );
        if (
          error instanceof NotFoundException ||
          error instanceof BadRequestException
        ) {
          throw error;
        }
        throw new BadRequestException('Failed to reorder bibliography items');
      } finally {
        await session.endSession();
      }
    } catch (error) {
      this.logger.error(
        'Error reordering bibliography items',
        error?.stack || error,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to reorder bibliography items');
    }
  }

  async getNextSequence(
    chapter_id: string | Types.ObjectId,
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
    const BibliographyModel = tenantConnection.model(
      Bibliography.name,
      BibliographySchema,
    );

    try {
      const lastBibliography = await BibliographyModel.findOne({
        chapter_id: new Types.ObjectId(chapter_id),
        deleted_at: null,
      })
        .sort({ sequence: -1 })
        .select('sequence')
        .lean();
      return lastBibliography ? lastBibliography.sequence + 1 : 1;
    } catch (error) {
      this.logger.error('Error getting next sequence', error?.stack || error);
      throw new BadRequestException('Failed to get next sequence');
    }
  }
}
