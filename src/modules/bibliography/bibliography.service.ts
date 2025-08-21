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
import { ChaptersService } from '../chapters/chapters.service';
import { ErrorMessageService } from 'src/common/services/error-message.service';
import { DEFAULT_LANGUAGE } from 'src/common/constants/language.constant';
import { AnchorTagService } from '../anchor-tag/anchor-tag.service';

@Injectable()
export class BibliographyService {
  private readonly logger = new Logger(BibliographyService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly chaptersService: ChaptersService,
    private readonly errorMessageService: ErrorMessageService,
    private readonly anchorTagService: AnchorTagService,
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
            'BIBLIOGRAPHY',
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
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'MODULE',
            'NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Validate chapter exists and belongs to the module
      const chapter = await ChapterModel.findOne({
        _id: new Types.ObjectId(chapter_id),
        module_id: new Types.ObjectId(module_id),
        deleted_at: null,
      });
      if (!chapter) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'CHAPTER',
            'NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
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

      // After saving the bibliography, recalculate chapter duration
      await this.chaptersService.recalculateChapterDuration(
        new Types.ObjectId(chapter_id),
        tenantConnection,
      );

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'BIBLIOGRAPHY',
          'CREATED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
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
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'BIBLIOGRAPHY',
          'CREATE_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
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

      pipeline.push({
        $lookup: {
          from: 'anchor_tags',
          let: { bibliography_id: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$bibliography_id', '$$bibliography_id'] },
                    { $eq: ['$deleted_at', null] },
                    { $eq: ['$status', 'ACTIVE'] },
                  ],
                },
              },
            },
          ],
          as: 'anchor_points',
        },
      });

      // Add student attempt status to anchor points if user is a student
      if (user.role.name === RoleEnum.STUDENT) {
        pipeline.push({
          $lookup: {
            from: 'student_anchor_tag_attempts',
            let: { bibliography_id: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$bibliography_id', '$$bibliography_id'] },
                      { $eq: ['$student_id', new Types.ObjectId(user.id)] },
                      { $eq: ['$deleted_at', null] },
                    ],
                  },
                },
              },
              {
                $group: {
                  _id: '$anchor_tag_id',
                  latest_attempt: { $last: '$$ROOT' },
                },
              },
              {
                $project: {
                  anchor_tag_id: '$_id',
                  status: '$latest_attempt.status',
                },
              },
            ],
            as: 'student_attempts',
          },
        });

        // Add student attempt status to each anchor point
        pipeline.push({
          $addFields: {
            anchor_points: {
              $map: {
                input: '$anchor_points',
                as: 'anchor_point',
                in: {
                  $mergeObjects: [
                    '$$anchor_point',
                    {
                      student_attempt_status: {
                        $let: {
                          vars: {
                            matching_attempt: {
                              $arrayElemAt: [
                                {
                                  $filter: {
                                    input: '$student_attempts',
                                    as: 'attempt',
                                    cond: {
                                      $eq: [
                                        '$$attempt.anchor_tag_id',
                                        '$$anchor_point._id',
                                      ],
                                    },
                                  },
                                },
                                0,
                              ],
                            },
                          },
                          in: {
                            $ifNull: [
                              '$$matching_attempt.status',
                              'NOT_STARTED',
                            ],
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        });

        // Remove the temporary student_attempts field
        pipeline.push({
          $project: {
            student_attempts: 0,
          },
        });
      }

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
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'BIBLIOGRAPHY',
          'RETRIEVED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: result.data,
        pagination_data: result.pagination_data,
      };
    } catch (error) {
      this.logger.error('Error finding bibliography', error?.stack || error);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'BIBLIOGRAPHY',
          'RETRIEVE_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
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
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'BIBLIOGRAPHY',
            'NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Attach user details
      const bibliographyWithUser = await attachUserDetailsToEntity(
        bibliography,
        this.userModel,
      );

      // Add anchor points to the bibliography item
      let bibliographyWithAnchorPoints = bibliographyWithUser;
      try {
        const anchorPoints =
          await this.anchorTagService.getAnchorTagsByChapterAndModule(
            bibliography.chapter_id,
            bibliography.module_id,
            user,
          );
        bibliographyWithAnchorPoints = {
          ...bibliographyWithUser,
          anchor_points: anchorPoints,
        } as any;
      } catch (error) {
        this.logger.warn(
          `Failed to fetch anchor points for chapter ${bibliography.chapter_id} and module ${bibliography.module_id}:`,
          error,
        );
        bibliographyWithAnchorPoints = {
          ...bibliographyWithUser,
          anchor_points: [],
        } as any;
      }

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'BIBLIOGRAPHY',
          'RETRIEVED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: bibliographyWithAnchorPoints,
      };
    } catch (error) {
      this.logger.error('Error finding bibliography', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'BIBLIOGRAPHY',
          'RETRIEVE_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
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
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'BIBLIOGRAPHY',
            'NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Validate module if provided
      if (updateBibliographyDto.module_id) {
        const module = await ModuleModel.findOne({
          _id: updateBibliographyDto.module_id,
          deleted_at: null,
        });
        if (!module) {
          throw new NotFoundException(
            this.errorMessageService.getMessageWithLanguage(
              'MODULE',
              'NOT_FOUND',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          );
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
            this.errorMessageService.getMessageWithLanguage(
              'CHAPTER',
              'NOT_FOUND',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
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
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'BIBLIOGRAPHY',
            'NOT_FOUND_DURING_UPDATE',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      this.logger.log(`Bibliography updated: ${updatedBibliography._id}`);

      // After updating the bibliography, recalculate chapter duration
      await this.chaptersService.recalculateChapterDuration(
        updatedBibliography.chapter_id,
        tenantConnection,
      );

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'BIBLIOGRAPHY',
          'UPDATED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
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
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'BIBLIOGRAPHY',
          'UPDATE_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  async deleteBibliography(
    id: string | Types.ObjectId,
    user: JWTUserPayload,
    school_id?: string,
  ) {
    this.logger.log(`Deleting bibliography: ${id} by user: ${user.id}`);

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
    const BibliographyModel = tenantConnection.model(
      Bibliography.name,
      BibliographySchema,
    );

    const session = await tenantConnection.startSession();

    try {
      await session.withTransaction(async () => {
        // Step 1: Find the bibliography
        const bibliography = await BibliographyModel.findOne({
          _id: id,
          deleted_at: null,
        }).session(session);

        if (!bibliography) {
          throw new NotFoundException(
            this.errorMessageService.getMessageWithLanguage(
              'BIBLIOGRAPHY',
              'NOT_FOUND',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          );
        }

        // Optional: If `sequence` exists and you need to reorder, extract it here
        const sequence = bibliography.sequence;
        const chapter_id = bibliography.chapter_id;

        // Step 2: Soft delete and move sequence to -1 to avoid duplication
        const deletedBibliography = await BibliographyModel.findByIdAndUpdate(
          id,
          {
            $set: {
              deleted_at: new Date(),
              sequence: -1, // Ensure no conflict with other bibliographies
            },
          },
          { new: true, session },
        );

        if (!deletedBibliography) {
          throw new NotFoundException(
            this.errorMessageService.getMessageWithLanguage(
              'BIBLIOGRAPHY',
              'NOT_FOUND_DURING_UPDATE',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          );
        }

        // Optional Step 3: after deleting a bibliography, we need to decrement the sequence of the other bibliographies in the same chapter
        await BibliographyModel.updateMany(
          {
            chapter_id,
            sequence: { $gt: sequence },
            deleted_at: null,
          },
          {
            $inc: { sequence: -1 },
            updated_at: new Date(),
          },
        ).session(session);

        // Step 4: Recalculate chapter duration
        await this.chaptersService.recalculateChapterDuration(
          bibliography.chapter_id,
          tenantConnection,
        );
      });

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'BIBLIOGRAPHY',
          'DELETED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: {
          id,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error deleting bibliography', error?.stack || error);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'BIBLIOGRAPHY',
          'DELETE_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    } finally {
      await session.endSession();
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
        this.errorMessageService.getMessageWithLanguage(
          'BIBLIOGRAPHY',
          'BIBLIOGRAPHY_ITEMS_REQUIRED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    this.logger.log(`Reordering bibliography items by user: ${user.id}`);

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
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'BIBLIOGRAPHY',
            'ONE_OR_MORE_NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Check if all bibliography items belong to the same chapter
      const chapterIds = [
        ...new Set(existingBibliography.map((b) => b.chapter_id.toString())),
      ];
      if (chapterIds.length > 1) {
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'BIBLIOGRAPHY',
            'SAME_CHAPTER_REQUIRED',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Check for duplicate sequences
      const sequences = bibliography_items.map((b) => b.new_sequence);
      const uniqueSequences = [...new Set(sequences)];
      if (sequences.length !== uniqueSequences.length) {
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'BIBLIOGRAPHY',
            'DUPLICATE_SEQUENCE',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
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
          message: this.errorMessageService.getSuccessMessageWithLanguage(
            'BIBLIOGRAPHY',
            'REORDERED_SUCCESSFULLY',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
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
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'BIBLIOGRAPHY',
            'REORDER_FAILED',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
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
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'BIBLIOGRAPHY',
          'REORDER_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  async getNextSequence(
    chapter_id: string | Types.ObjectId,
    user: JWTUserPayload,
  ): Promise<number> {
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
    const BibliographyModel = tenantConnection.model(
      Bibliography.name,
      BibliographySchema,
    );

    try {
      // Get the highest sequence number for this chapter, including soft-deleted records
      // This ensures we don't conflict with the compound index that includes deleted_at
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
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'BIBLIOGRAPHY',
          'SEQUENCE_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }
}
