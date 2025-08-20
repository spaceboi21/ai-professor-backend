import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ActivityLog,
  ActivityLogSchema,
} from 'src/database/schemas/central/activity-log.schema';
import { User } from 'src/database/schemas/central/user.schema';
import { School } from 'src/database/schemas/central/school.schema';
import {
  Student,
  StudentSchema,
} from 'src/database/schemas/tenant/student.schema';
import {
  ActivityTypeEnum,
  ActivityCategoryEnum,
  ActivityLevelEnum,
  ACTIVITY_CATEGORY_MAPPING,
  ACTIVITY_LEVEL_MAPPING,
} from 'src/common/constants/activity.constant';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import {
  getPaginationOptions,
  createPaginationResult,
} from 'src/common/utils/pagination.util';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { EmailEncryptionService } from 'src/common/services/email-encryption.service';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { TenantService } from 'src/modules/central/tenant.service';
import {
  TranslationService,
  MultiLanguageContent,
} from 'src/common/services/translation.service';

export interface CreateActivityLogDto {
  activity_type: ActivityTypeEnum;
  description: string | { en: string; fr: string };
  performed_by: Types.ObjectId;
  performed_by_role: RoleEnum;
  school_id?: Types.ObjectId;
  school_name?: string;
  target_user_id?: Types.ObjectId;
  target_user_email?: string;
  target_user_role?: RoleEnum;
  module_id?: Types.ObjectId;
  module_name?: string;
  chapter_id?: Types.ObjectId;
  chapter_name?: string;
  quiz_group_id?: Types.ObjectId;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  is_success?: boolean;
  error_message?: string;
  execution_time_ms?: number;
  endpoint?: string;
  http_method?: string;
  http_status_code?: number;
  status?: 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO';
}

export interface ActivityLogFilterDto extends PaginationDto {
  activity_type?: ActivityTypeEnum;
  category?: ActivityCategoryEnum;
  level?: ActivityLevelEnum;
  performed_by_role?: RoleEnum;
  school_id?: string;
  target_user_id?: string;
  module_id?: string;
  chapter_id?: string;
  is_success?: boolean;
  status?: 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO';
  start_date?: string;
  end_date?: string;
  search?: string;
}

interface PopulatedUser {
  _id: Types.ObjectId;
  first_name: string;
  last_name: string;
  email: string;
  profile_pic?: string;
}

interface PopulatedSchool {
  _id: Types.ObjectId;
  name: string;
}

export interface UserDetails {
  id: Types.ObjectId;
  name: string;
  email: string;
  role: string;
  profile_pic?: string | null;
}

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(
    @InjectModel(ActivityLog.name)
    private readonly activityLogModel: Model<ActivityLog>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly emailEncryptionService: EmailEncryptionService,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly tenantService: TenantService,
    private readonly translationService: TranslationService,
  ) {}

  private safeObjectIdConversion(
    id: string | undefined | null | Types.ObjectId,
  ): Types.ObjectId | undefined {
    if (!id) return undefined;

    try {
      // If it's already an ObjectId, return it
      if (id instanceof Types.ObjectId) {
        return id;
      }

      // If it's a string, validate and convert
      if (typeof id === 'string') {
        if (!Types.ObjectId.isValid(id)) {
          this.logger.warn(`Invalid ObjectId format: ${id}`);
          return undefined;
        }
        return new Types.ObjectId(id);
      }

      return undefined;
    } catch (error) {
      this.logger.warn(`Error converting to ObjectId: ${id}`, error.message);
      return undefined;
    }
  }

  async createActivityLog(
    createActivityLogDto: CreateActivityLogDto,
  ): Promise<ActivityLog> {
    try {
      this.logger.debug(
        `Creating activity log: ${createActivityLogDto.activity_type}`,
      );
      this.logger.debug(`Activity log DTO:`, createActivityLogDto);

      // Check for duplicate activity before creating
      if (createActivityLogDto.endpoint && createActivityLogDto.performed_by) {
        // Check for duplicate within 1-10 seconds range (skip very recent duplicates)
        const oneSecondAgo = new Date(Date.now() - 1 * 1000); // 1 second ago
        const tenSecondsAgo = new Date(Date.now() - 10 * 1000); // 10 seconds ago

        const duplicateQuery: any = {
          performed_by: createActivityLogDto.performed_by,
          activity_type: createActivityLogDto.activity_type,
          endpoint: createActivityLogDto.endpoint,
          http_method: createActivityLogDto.http_method,
          created_at: {
            $gte: tenSecondsAgo, // Between 10 seconds ago
            $lte: oneSecondAgo, // and 1 second ago
          },
        };

        // Add more specific fields for exact matching
        if (createActivityLogDto.module_id) {
          duplicateQuery.module_id = createActivityLogDto.module_id;
        }
        if (createActivityLogDto.chapter_id) {
          duplicateQuery.chapter_id = createActivityLogDto.chapter_id;
        }
        if (createActivityLogDto.quiz_group_id) {
          duplicateQuery.quiz_group_id = createActivityLogDto.quiz_group_id;
        }

        const existingLog = await this.activityLogModel.findOne(duplicateQuery);

        if (existingLog) {
          const timeDiff = existingLog.created_at
            ? Math.round((Date.now() - existingLog.created_at.getTime()) / 1000)
            : 'unknown';
          this.logger.log(
            `Skipping duplicate activity log: ${createActivityLogDto.activity_type} by ${createActivityLogDto.performed_by} on ${createActivityLogDto.endpoint} (found similar log created ${timeDiff} seconds ago)`,
          );
          // Return the existing log to prevent downstream errors
          return existingLog;
        }
      }

      const {
        activity_type,
        target_user_email,
        description: originalDescription,
        ...rest
      } = createActivityLogDto;

      const category = ACTIVITY_CATEGORY_MAPPING[activity_type];
      const level = ACTIVITY_LEVEL_MAPPING[activity_type];

      // Handle description field - support both string and language object
      let description: string | { en: string; fr: string };
      if (typeof originalDescription === 'string') {
        // If description is a string, convert to language object with English as default
        description = {
          en: originalDescription,
          fr: originalDescription, // Use same text for French initially
        };
      } else {
        // If description is already a language object, use it as is
        description = originalDescription;
      }

      // Encrypt target_user_email if provided
      const encryptedTargetUserEmail = target_user_email
        ? this.emailEncryptionService.encryptEmailFields(
            { target_user_email },
            ['target_user_email'],
          ).target_user_email
        : undefined;

      const activityLog = new this.activityLogModel({
        activity_type,
        category,
        level,
        description,
        target_user_email: encryptedTargetUserEmail,
        ...rest,
      });

      this.logger.debug(`Saving activity log to database...`);
      const savedLog = await activityLog.save();
      this.logger.log(
        `Activity logged: ${activity_type} by ${createActivityLogDto.performed_by} with ID: ${savedLog._id}`,
      );

      return savedLog;
    } catch (error) {
      // Log the error but don't throw - this prevents breaking the main application
      this.logger.error('Error creating activity log (non-critical):', {
        error: error.message,
        stack: error.stack,
        activityType: createActivityLogDto.activity_type,
        performedBy: createActivityLogDto.performed_by,
        endpoint: createActivityLogDto.endpoint,
      });

      // Return a mock log object to prevent downstream errors
      return {
        _id: 'error-log-id',
        activity_type: createActivityLogDto.activity_type,
        category: ACTIVITY_CATEGORY_MAPPING[createActivityLogDto.activity_type],
        level: ACTIVITY_LEVEL_MAPPING[createActivityLogDto.activity_type],
        description: createActivityLogDto.description,
        performed_by: createActivityLogDto.performed_by,
        performed_by_role: createActivityLogDto.performed_by_role,
        is_success: false,
        status: 'ERROR',
        created_at: new Date(),
        updated_at: new Date(),
      } as any;
    }
  }

  async getActivityLogs(
    currentUser: JWTUserPayload,
    filterDto: ActivityLogFilterDto,
  ) {
    try {
      this.logger.log(
        `Getting activity logs for user: ${currentUser.id} with role: ${currentUser.role.name}`,
      );

      const options = getPaginationOptions(filterDto);
      const query: any = {};

      // Apply role-based access control
      await this.applyAccessControl(query, currentUser);

      // Apply filters
      if (filterDto.activity_type) {
        query.activity_type = filterDto.activity_type;
      }

      if (filterDto.category) {
        query.category = filterDto.category;
      }

      if (filterDto.level) {
        query.level = filterDto.level;
      }

      if (filterDto.performed_by_role) {
        query.performed_by_role = filterDto.performed_by_role;
      }

      if (filterDto.school_id) {
        const schoolObjectId = this.safeObjectIdConversion(filterDto.school_id);
        if (schoolObjectId) {
          query.school_id = schoolObjectId;
        }
      }

      if (filterDto.target_user_id) {
        const targetUserObjectId = this.safeObjectIdConversion(
          filterDto.target_user_id,
        );
        if (targetUserObjectId) {
          query.target_user_id = targetUserObjectId;
        }
      }

      if (filterDto.module_id) {
        const moduleObjectId = this.safeObjectIdConversion(filterDto.module_id);
        if (moduleObjectId) {
          query.module_id = moduleObjectId;
        }
      }

      if (filterDto.chapter_id) {
        const chapterObjectId = this.safeObjectIdConversion(
          filterDto.chapter_id,
        );
        if (chapterObjectId) {
          query.chapter_id = chapterObjectId;
        }
      }

      if (filterDto.is_success !== undefined) {
        query.is_success = filterDto.is_success;
      }

      if (filterDto.status) {
        query.status = filterDto.status;
      }

      // Date range filter
      if (filterDto.start_date || filterDto.end_date) {
        query.created_at = {};
        if (filterDto.start_date) {
          query.created_at.$gte = new Date(filterDto.start_date);
        }
        if (filterDto.end_date) {
          query.created_at.$lte = new Date(filterDto.end_date);
        }
      }

      // Text search
      if (filterDto.search) {
        // Encrypt the search term for email fields
        const encryptedSearchTerm =
          this.emailEncryptionService.encryptEmailFields(
            { search: filterDto.search },
            ['search'],
          ).search;

        query.$or = [
          // Search in string descriptions
          { description: { $regex: filterDto.search, $options: 'i' } },
          // Search in language object descriptions
          { 'description.en': { $regex: filterDto.search, $options: 'i' } },
          { 'description.fr': { $regex: filterDto.search, $options: 'i' } },
          { school_name: { $regex: filterDto.search, $options: 'i' } },
          { target_user_email: { $regex: encryptedSearchTerm, $options: 'i' } },
          { module_name: { $regex: filterDto.search, $options: 'i' } },
          { chapter_name: { $regex: filterDto.search, $options: 'i' } },
        ];
      }

      // Get logs with user and school population
      const logs = await this.activityLogModel
        .find(query)
        .populate('school_id', 'name')
        .sort({ created_at: -1 })
        .skip(options.skip)
        .limit(options.limit)
        .lean();

      const total = await this.activityLogModel.countDocuments(query);

      // Transform the data for better readability with custom user population
      const transformedLogs = await Promise.all(
        logs.map(async (log) => {
          const school = log.school_id as any;
          const targetUser = log.target_user_id as any;

          // Decrypt target_user_email if it exists
          const decryptedLog = this.emailEncryptionService.decryptEmailFields(
            log,
            ['target_user_email'],
          );

          // Get performed_by user details based on role
          let performedBy: UserDetails | null = null;
          if (log.performed_by) {
            performedBy = await this.getUserDetails(
              log.performed_by.toString(),
              log.performed_by_role,
              log.school_id._id?.toString(),
            );
          }

          // Get target_user details based on role
          let targetUserDetails: UserDetails | null = null;
          if (targetUser && log.target_user_role) {
            targetUserDetails = await this.getUserDetails(
              targetUser.toString(),
              log.target_user_role,
              log.school_id._id?.toString(),
            );
          }

          // Helper function to safely extract description text
          const getDescriptionText = (desc: any, lang: 'en' | 'fr'): string => {
            if (
              desc &&
              typeof desc === 'object' &&
              'en' in desc &&
              'fr' in desc
            ) {
              return desc[lang] || desc.en || 'No description available';
            }
            return desc || 'No description available';
          };

          return {
            id: log._id,
            timestamp: log.created_at,
            activity_type: log.activity_type,
            category: log.category,
            level: log.level,
            description_en: getDescriptionText(log.description, 'en'),
            description_fr: getDescriptionText(log.description, 'fr'),
            performed_by: performedBy,
            school:
              school && school.name
                ? {
                    id: school._id,
                    name: school.name,
                  }
                : null,
            target_user: targetUserDetails,
            target_user_email: decryptedLog.target_user_email || null,
            module: log.module_id
              ? {
                  id: log.module_id,
                  name: log.module_name,
                }
              : null,
            chapter: log.chapter_id
              ? {
                  id: log.chapter_id,
                  name: log.chapter_name,
                }
              : null,
            metadata: log.metadata,
            ip_address: log.ip_address,
            user_agent: log.user_agent,
            is_success: log.is_success,
            error_message: log.error_message,
            execution_time_ms: log.execution_time_ms,
            endpoint: log.endpoint,
            http_method: log.http_method,
            http_status_code: log.http_status_code,
            status: log.status,
          };
        }),
      );

      return createPaginationResult(transformedLogs, total, options);
    } catch (error) {
      this.logger.error('Error getting activity logs (non-critical):', {
        error: error.message,
        userId: currentUser.id,
        userRole: currentUser.role.name,
      });

      // Return empty result instead of throwing
      return createPaginationResult([], 0, getPaginationOptions(filterDto));
    }
  }

  private isPopulatedUser(user: any): user is PopulatedUser {
    return user && typeof user === 'object' && 'first_name' in user;
  }

  private isPopulatedSchool(school: any): school is PopulatedSchool {
    return school && typeof school === 'object' && 'name' in school;
  }

  /**
   * Helper method to get user details based on role
   * Students are fetched from tenant database, others from central database
   */
  private async getUserDetails(
    userId: string,
    userRole: string,
    schoolId?: string,
  ): Promise<UserDetails | null> {
    try {
      this.logger.debug(
        `Getting user details for userId: ${userId}, userRole: ${userRole}`,
      );

      // Normalize role comparison - handle both string and enum values
      const normalizedRole = userRole?.toString()?.toUpperCase();
      this.logger.debug(`Normalized role: ${normalizedRole}`);

      if (normalizedRole === RoleEnum.STUDENT && schoolId) {
        // Students are stored in tenant database - use the tenant connection
        this.logger.debug(`Fetching student details from tenant database`);

        try {
          const dbName = await this.tenantService.getTenantDbName(schoolId);
          const tenantConnection =
            await this.tenantConnectionService.getTenantConnection(dbName);
          const StudentModel = tenantConnection.model(
            Student.name,
            StudentSchema,
          );

          const student = await StudentModel.findById(
            new Types.ObjectId(userId),
          )
            .select('first_name last_name email profile_pic')
            .lean();
          if (student) {
            this.logger.debug(
              `Student found: ${student.first_name} ${student.last_name}`,
            );
            return {
              id: student._id,
              name: `${student.first_name} ${student.last_name}`.trim(),
              email: this.emailEncryptionService.decryptEmail(student.email),
              role: RoleEnum.STUDENT,
              profile_pic: student.profile_pic || null,
            };
          } else {
            this.logger.warn(`Student not found in tenant database: ${userId}`);
          }
        } catch (error) {
          this.logger.warn(
            `Error fetching student from tenant database: ${error.message}`,
          );
        }
      } else {
        // Professors, admins, etc. are stored in central database
        this.logger.debug(
          `Fetching user details from central database for role: ${userRole}`,
        );

        const objectId = new Types.ObjectId(userId);
        const user = await this.userModel
          .findById(objectId)
          .select('first_name last_name email profile_pic')
          .lean();

        if (user) {
          this.logger.debug(`User found: ${user.first_name} ${user.last_name}`);
          return {
            id: user._id,
            name: `${user.first_name} ${user.last_name}`.trim(),
            email: this.emailEncryptionService.decryptEmail(user.email),
            role: userRole,
            profile_pic: user.profile_pic || null,
          };
        } else {
          this.logger.warn(`User not found in central database: ${userId}`);
        }
      }

      this.logger.warn(
        `No user details found for userId: ${userId}, userRole: ${userRole}`,
      );
      return null;
    } catch (error) {
      this.logger.error(
        `Error fetching user details for userId: ${userId}, userRole: ${userRole}`,
        error?.stack || error,
      );
      return null;
    }
  }

  private async applyAccessControl(
    query: any,
    currentUser: JWTUserPayload,
  ): Promise<void> {
    switch (currentUser.role.name) {
      case RoleEnum.SUPER_ADMIN:
        // Super admin can see all logs - no restrictions
        break;

      case RoleEnum.SCHOOL_ADMIN:
        // School admin can only see logs from their school
        if (!currentUser.school_id) {
          throw new UnauthorizedException(
            'School admin must belong to a school',
          );
        }
        const schoolObjectId = this.safeObjectIdConversion(
          currentUser.school_id,
        );
        if (!schoolObjectId) {
          throw new UnauthorizedException('Invalid school ID format');
        }
        query.school_id = schoolObjectId;
        break;

      case RoleEnum.PROFESSOR:
        // Professor can see logs from their school and their own activities
        if (!currentUser.school_id) {
          throw new UnauthorizedException('Professor must belong to a school');
        }
        const professorSchoolObjectId = this.safeObjectIdConversion(
          currentUser.school_id,
        );
        const professorUserObjectId = this.safeObjectIdConversion(
          currentUser.id,
        );

        if (!professorSchoolObjectId || !professorUserObjectId) {
          throw new UnauthorizedException('Invalid user or school ID format');
        }

        query.$or = [
          { school_id: professorSchoolObjectId },
          { performed_by: professorUserObjectId },
        ];
        break;

      case RoleEnum.STUDENT:
        // Students can only see their own activities
        const studentUserObjectId = this.safeObjectIdConversion(currentUser.id);
        if (!studentUserObjectId) {
          throw new UnauthorizedException('Invalid user ID format');
        }
        query.performed_by = studentUserObjectId;
        break;

      default:
        throw new UnauthorizedException('Invalid user role');
    }
  }

  async getActivityLogById(
    logId: string,
    currentUser: JWTUserPayload,
  ): Promise<any> {
    try {
      // Validate ObjectId format
      if (!Types.ObjectId.isValid(logId)) {
        throw new BadRequestException('Invalid activity log ID format');
      }

      const log = await this.activityLogModel
        .findById(logId)
        .populate('school_id', 'name')
        .lean();

      if (!log) {
        throw new BadRequestException('Activity log not found');
      }

      // Check access control
      const query: any = { _id: new Types.ObjectId(logId) };
      await this.applyAccessControl(query, currentUser);

      const hasAccess = await this.activityLogModel.exists(query);
      if (!hasAccess) {
        throw new UnauthorizedException('Access denied to this activity log');
      }

      const school = log.school_id as any;

      // Get performed_by user details based on role
      let performedBy: UserDetails | null = null;
      if (log.performed_by) {
        performedBy = await this.getUserDetails(
          log.performed_by.toString(),
          log.performed_by_role,
          log.school_id?.toString(),
        );
      }

      // Get target_user details based on role
      let targetUserDetails: UserDetails | null = null;
      if (log.target_user_id && log.target_user_role) {
        targetUserDetails = await this.getUserDetails(
          log.target_user_id.toString(),
          log.target_user_role,
          log.school_id?.toString(),
        );
      }

      // Helper function to safely extract description text
      const getDescriptionText = (desc: any, lang: 'en' | 'fr'): string => {
        if (desc && typeof desc === 'object' && 'en' in desc && 'fr' in desc) {
          return desc[lang] || desc.en || 'No description available';
        }
        return desc || 'No description available';
      };

      return {
        id: log._id,
        timestamp: log.created_at,
        activity_type: log.activity_type,
        category: log.category,
        level: log.level,
        description_en: getDescriptionText(log.description, 'en'),
        description_fr: getDescriptionText(log.description, 'fr'),
        performed_by: performedBy,
        school:
          school && school.name
            ? {
                id: school._id,
                name: school.name,
              }
            : null,
        target_user: targetUserDetails,
        module: log.module_id
          ? {
              id: log.module_id,
              name: log.module_name,
            }
          : null,
        chapter: log.chapter_id
          ? {
              id: log.chapter_id,
              name: log.chapter_name,
            }
          : null,
        metadata: log.metadata,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        is_success: log.is_success,
        error_message: log.error_message,
        execution_time_ms: log.execution_time_ms,
        endpoint: log.endpoint,
        http_method: log.http_method,
        http_status_code: log.http_status_code,
        status: log.status,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Error getting activity log by ID:', error);
      throw new BadRequestException('Failed to retrieve activity log');
    }
  }

  async getActivityStats(currentUser: JWTUserPayload, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query: any = { created_at: { $gte: startDate } };
    await this.applyAccessControl(query, currentUser);

    const stats = await this.activityLogModel.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            activity_type: '$activity_type',
            category: '$category',
            level: '$level',
            is_success: '$is_success',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.category',
          activities: {
            $push: {
              type: '$_id.activity_type',
              level: '$_id.level',
              success_count: {
                $cond: [{ $eq: ['$_id.is_success', true] }, '$count', 0],
              },
              error_count: {
                $cond: [{ $eq: ['$_id.is_success', false] }, '$count', 0],
              },
              total_count: '$count',
            },
          },
        },
      },
    ]);

    return stats;
  }

  async exportActivityLogs(
    currentUser: JWTUserPayload,
    filterDto: ActivityLogFilterDto,
  ): Promise<any[]> {
    this.logger.log(`Exporting activity logs for user: ${currentUser.id}`);

    const query: any = {};
    await this.applyAccessControl(query, currentUser);

    // Apply the same filters as getActivityLogs
    if (filterDto.activity_type) query.activity_type = filterDto.activity_type;
    if (filterDto.category) query.category = filterDto.category;
    if (filterDto.level) query.level = filterDto.level;
    if (filterDto.performed_by_role)
      query.performed_by_role = filterDto.performed_by_role;
    if (filterDto.school_id) {
      const schoolObjectId = this.safeObjectIdConversion(filterDto.school_id);
      if (schoolObjectId) {
        query.school_id = schoolObjectId;
      }
    }
    if (filterDto.target_user_id) {
      const targetUserObjectId = this.safeObjectIdConversion(
        filterDto.target_user_id,
      );
      if (targetUserObjectId) {
        query.target_user_id = targetUserObjectId;
      }
    }
    if (filterDto.module_id) {
      const moduleObjectId = this.safeObjectIdConversion(filterDto.module_id);
      if (moduleObjectId) {
        query.module_id = moduleObjectId;
      }
    }
    if (filterDto.chapter_id) {
      const chapterObjectId = this.safeObjectIdConversion(filterDto.chapter_id);
      if (chapterObjectId) {
        query.chapter_id = chapterObjectId;
      }
    }
    if (filterDto.is_success !== undefined)
      query.is_success = filterDto.is_success;

    if (filterDto.start_date || filterDto.end_date) {
      query.created_at = {};
      if (filterDto.start_date)
        query.created_at.$gte = new Date(filterDto.start_date);
      if (filterDto.end_date)
        query.created_at.$lte = new Date(filterDto.end_date);
    }

    if (filterDto.search) {
      // Encrypt the search term for email fields
      const encryptedSearchTerm =
        this.emailEncryptionService.encryptEmailFields(
          { search: filterDto.search },
          ['search'],
        ).search;

      query.$or = [
        // Search in string descriptions
        { description: { $regex: filterDto.search, $options: 'i' } },
        // Search in language object descriptions
        { 'description.en': { $regex: filterDto.search, $options: 'i' } },
        { 'description.fr': { $regex: filterDto.search, $options: 'i' } },
        { school_name: { $regex: filterDto.search, $options: 'i' } },
        { target_user_email: { $regex: encryptedSearchTerm, $options: 'i' } },
        { module_name: { $regex: filterDto.search, $options: 'i' } },
        { chapter_name: { $regex: filterDto.search, $options: 'i' } },
      ];
    }

    const logs = await this.activityLogModel
      .find(query)
      .populate('school_id', 'name')
      .sort({ created_at: -1 })
      .lean();

    // Transform logs with custom user population
    const transformedLogs = await Promise.all(
      logs.map(async (log) => {
        const school = log.school_id as any;

        // Decrypt target_user_email if it exists
        const decryptedLog = this.emailEncryptionService.decryptEmailFields(
          log,
          ['target_user_email'],
        );

        // Get performed_by user details based on role
        let performedBy: UserDetails | null = null;
        let performedByEmail = 'N/A';
        if (log.performed_by) {
          performedBy = await this.getUserDetails(
            log.performed_by.toString(),
            log.performed_by_role,
            log.school_id?.toString(),
          );
          if (performedBy && performedBy.email) {
            performedByEmail = performedBy.email;
          }
        }

        // Get target_user details based on role
        let targetUser: UserDetails | null = null;
        let targetUserEmail = 'N/A';
        if (log.target_user_id && log.target_user_role) {
          targetUser = await this.getUserDetails(
            log.target_user_id.toString(),
            log.target_user_role,
            log.school_id?.toString(),
          );
          if (targetUser && targetUser.email) {
            targetUserEmail = targetUser.email;
          }
        }

        // Helper function to safely extract description text
        const getDescriptionText = (desc: any, lang: 'en' | 'fr'): string => {
          if (
            desc &&
            typeof desc === 'object' &&
            'en' in desc &&
            'fr' in desc
          ) {
            return desc[lang] || desc.en || 'No description available';
          }
          return desc || 'No description available';
        };

        return {
          timestamp: log.created_at,
          activity_type: log.activity_type,
          category: log.category,
          level: log.level,
          description_en: getDescriptionText(log.description, 'en'),
          description_fr: getDescriptionText(log.description, 'fr'),
          performed_by: performedBy ? performedBy.name : 'N/A',
          performed_by_email: performedByEmail,
          performed_by_role: log.performed_by_role,
          school: school && school.name ? school.name : 'N/A',
          target_user: targetUser ? targetUser.name : 'N/A',
          target_user_email: decryptedLog.target_user_email || targetUserEmail,
          target_user_role: log.target_user_role || 'N/A',
          module: log.module_name || 'N/A',
          chapter: log.chapter_name || 'N/A',
          is_success: log.is_success ? 'Success' : 'Failed',
          error_message: log.error_message || 'N/A',
          execution_time_ms: log.execution_time_ms || 'N/A',
          ip_address: log.ip_address || 'N/A',
          endpoint: log.endpoint || 'N/A',
          http_method: log.http_method || 'N/A',
          http_status_code: log.http_status_code || 'N/A',
          status: log.status,
        };
      }),
    );

    return transformedLogs;
  }

  /**
   * Generate description in both English and French based on activity type and context
   */
  async generateDescription(
    activityType: ActivityTypeEnum,
    context: Record<string, any> = {},
    isSuccess: boolean = true,
  ): Promise<MultiLanguageContent> {
    try {
      // Get user details for context
      let userName = 'User';
      if (context.performed_by) {
        const userDetails = await this.getUserDetails(
          context.performed_by.toString(),
          context.performed_by_role || RoleEnum.STUDENT,
          context.school_id?.toString(),
        );
        if (userDetails) {
          userName = userDetails.name;
        }
      }

      // Get target user details for context
      let targetUserName = 'User';
      if (context.target_user_id && context.target_user_role) {
        const targetUserDetails = await this.getUserDetails(
          context.target_user_id.toString(),
          context.target_user_role,
          context.school_id?.toString(),
        );
        if (targetUserDetails) {
          targetUserName = targetUserDetails.name;
        }
      }

      // Prepare context for translation service
      const translationContext = {
        userName,
        targetUserName,
        schoolName: context.school_name || context.school?.name,
        moduleName: context.module_name || context.module?.name,
        chapterName: context.chapter_name || context.chapter?.name,
        action: context.action || context.description,
        ...context,
      };

      // Generate descriptions using translation service with success status
      return this.translationService.generateActivityDescription(
        activityType,
        translationContext,
        isSuccess,
      );
    } catch (error) {
      this.logger.warn(
        'Error generating description, using fallback',
        error.message,
      );

      // Fallback to simple descriptions with success status
      const status = isSuccess ? 'successfully' : 'failed';
      return {
        en: `User performed ${activityType} ${status}`,
        fr: `L'utilisateur a effectué ${activityType} ${isSuccess ? 'avec succès' : 'sans succès'}`,
      };
    }
  }

  /**
   * Create activity log with auto-generated descriptions
   */
  async createActivityLogWithGeneratedDescription(
    activityType: ActivityTypeEnum,
    context: Record<string, any> = {},
    additionalData: Partial<CreateActivityLogDto> = {},
  ): Promise<ActivityLog> {
    try {
      // Extract isSuccess from context or additionalData
      const isSuccess =
        context.is_success !== undefined
          ? context.is_success
          : additionalData.is_success !== undefined
            ? additionalData.is_success
            : true;

      // Generate descriptions in both languages with success status
      const descriptions = await this.generateDescription(
        activityType,
        context,
        isSuccess,
      );

      // Create the activity log DTO
      const createActivityLogDto: CreateActivityLogDto = {
        activity_type: activityType,
        description: descriptions, // This will be the multi-language object
        performed_by: context.performed_by,
        performed_by_role: context.performed_by_role,
        school_id: context.school_id,
        school_name: context.school_name,
        target_user_id: context.target_user_id,
        target_user_email: context.target_user_email,
        target_user_role: context.target_user_role,
        module_id: context.module_id,
        module_name: context.module_name,
        chapter_id: context.chapter_id,
        chapter_name: context.chapter_name,
        quiz_group_id: context.quiz_group_id,
        metadata: context.metadata,
        ip_address: context.ip_address,
        user_agent: context.user_agent,
        session_id: context.session_id,
        is_success: isSuccess,
        error_message: context.error_message,
        execution_time_ms: context.execution_time_ms,
        endpoint: context.endpoint,
        http_method: context.http_method,
        http_status_code: context.http_status_code,
        status: context.status,
        ...additionalData,
      };

      // Create the activity log
      return await this.createActivityLog(createActivityLogDto);
    } catch (error) {
      this.logger.error(
        'Error creating activity log with generated description',
        error,
      );
      throw error;
    }
  }
}
