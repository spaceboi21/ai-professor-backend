import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import {
  ActivityLogService,
  CreateActivityLogDto,
} from 'src/modules/activity-log/activity-log.service';
import { ActivityTypeEnum } from 'src/common/constants/activity.constant';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { Types } from 'mongoose';
import {
  getActivityDescription,
  ActivityDescriptionTranslations,
} from 'src/common/constants/activity-descriptions.constant';
import { MultiLanguageDescription } from 'src/database/schemas/central/activity-log.schema';

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ActivityLogInterceptor.name);

  constructor(private readonly activityLogService: ActivityLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const user = request.user as JWTUserPayload;

    // Skip logging for certain endpoints
    if (this.shouldSkipLogging(request)) {
      this.logger.debug(`Skipping logging for: ${request.url}`);
      return next.handle();
    }

    const startTime = Date.now();
    const activityType = this.determineActivityType(request);

    // Log what we're processing
    this.logger.debug(
      `Processing request: ${request.method} ${request.url} -> Activity: ${activityType}`,
    );

    return next.handle().pipe(
      tap((data) => {
        // Log successful activity - NON-BLOCKING
        this.logActivitySafely(
          request,
          response,
          user,
          activityType,
          true,
          null,
          Date.now() - startTime,
        );
      }),
      catchError((error) => {
        // Log failed activity - NON-BLOCKING
        this.logActivitySafely(
          request,
          response,
          user,
          activityType,
          false,
          error.message,
          Date.now() - startTime,
        );
        throw error;
      }),
    );
  }

  private safeObjectIdConversion(
    id: string | undefined | null,
  ): Types.ObjectId | undefined {
    if (!id) return undefined;

    try {
      if (!Types.ObjectId.isValid(id)) {
        this.logger.debug(`Invalid ObjectId format: ${id}`);
        return undefined;
      }
      return new Types.ObjectId(id);
    } catch (error) {
      this.logger.debug(`Error converting to ObjectId: ${id}`, error.message);
      return undefined;
    }
  }

  /**
   * Safely log activity without blocking the main application
   * This method is completely non-blocking and handles all errors internally
   */
  private async logActivitySafely(
    request: Request,
    response: Response,
    user: JWTUserPayload,
    activityType: ActivityTypeEnum,
    isSuccess: boolean,
    errorMessage: string | null,
    executionTimeMs: number,
  ): Promise<void> {
    try {
      // Skip logging for SYSTEM_MAINTENANCE activities
      if (activityType === ActivityTypeEnum.SYSTEM_MAINTENANCE) {
        this.logger.debug('Skipping SYSTEM_MAINTENANCE activity logging');
        return;
      }

      // Validate user exists
      if (!user) {
        this.logger.debug(
          'No user found in request for activity logging - skipping',
        );
        return;
      }

      // Validate required fields
      if (!user.id || !user.role?.name) {
        this.logger.debug('Invalid user data for activity logging - skipping');
        return;
      }

      // Enhanced logging for student activities
      if (
        user.role.name === RoleEnum.STUDENT &&
        this.isProgressRelatedActivity(activityType)
      ) {
        this.logger.debug(
          `Logging student activity: ${activityType} for user ${user.id} at ${request.url}`,
        );
      }

      const description = this.generateDescription(
        request,
        activityType,
        isSuccess,
        user.preferred_language,
      );
      const metadata = this.extractMetadata(request, response, activityType);

      // Log metadata for debugging student activities
      if (
        user.role.name === RoleEnum.STUDENT &&
        this.isProgressRelatedActivity(activityType)
      ) {
        this.logger.debug(`Student activity metadata:`, {
          activityType,
          module_id: metadata.module_id,
          chapter_id: metadata.chapter_id,
          quiz_group_id: metadata.quiz_group_id,
          score_percentage: metadata.score_percentage,
          progress_status: metadata.progress_status,
        });
      }

      // Determine status based on HTTP response code and success
      let status: 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO' = 'SUCCESS';
      if (!isSuccess) {
        status = 'ERROR';
      } else if (response.statusCode >= 400) {
        status = 'ERROR';
      } else if (response.statusCode >= 300) {
        status = 'WARNING';
      } else if (response.statusCode >= 200) {
        status = 'SUCCESS';
      }

      const createActivityLogDto: CreateActivityLogDto = {
        activity_type: activityType,
        description: descriptions.primary,
        description_en: descriptions.english,
        description_fr: descriptions.french,
        performed_by: this.safeObjectIdConversion(user.id?.toString()) as any,
        performed_by_role: user.role.name as RoleEnum,
        school_id: this.safeObjectIdConversion(user.school_id?.toString()),
        target_user_id: this.safeObjectIdConversion(
          metadata.target_user_id?.toString(),
        ),
        target_user_email: metadata.target_user_email,
        target_user_role: metadata.target_user_role,
        module_id: this.safeObjectIdConversion(metadata.module_id?.toString()),
        module_name: metadata.module_name,
        chapter_id: this.safeObjectIdConversion(
          metadata.chapter_id?.toString(),
        ),
        chapter_name: metadata.chapter_name,
        quiz_group_id: this.safeObjectIdConversion(
          metadata.quiz_group_id?.toString(),
        ),
        metadata: {
          ...metadata,
          request_body: this.sanitizeRequestBody(request.body),
          query_params: request.query,
          path_params: request.params,
        },
        ip_address: this.getClientIp(request),
        user_agent: request.get('User-Agent'),
        session_id: (request as any).session?.id,
        is_success: isSuccess,
        error_message: errorMessage || undefined,
        execution_time_ms: executionTimeMs,
        endpoint: request.url,
        http_method: request.method,
        http_status_code: response.statusCode,
        status: status,
      };

      // Use Promise.resolve().then() to make it truly non-blocking
      Promise.resolve()
        .then(async () => {
          try {
            this.logger.debug(
              `Attempting to create activity log: ${activityType}`,
            );
            const result =
              await this.activityLogService.createActivityLog(
                createActivityLogDto,
              );
            this.logger.debug(
              `Activity logged successfully: ${activityType} with ID: ${result._id}`,
            );
          } catch (logError) {
            // Log the error but don't throw - this prevents breaking the main application
            this.logger.error('Failed to log activity (non-critical):', {
              error: logError.message,
              stack: logError.stack,
              activityType,
              endpoint: request.url,
              userId: user.id,
            });
          }
        })
        .catch((promiseError) => {
          // Catch any unhandled promise rejections
          this.logger.error('Unhandled error in activity logging promise:', {
            error: promiseError.message,
            stack: promiseError.stack,
            activityType,
            endpoint: request.url,
          });
        });
    } catch (error) {
      // Catch any synchronous errors in the logging process
      this.logger.error('Error in activity logging (non-critical):', {
        error: error.message,
        stack: error.stack,
        activityType,
        endpoint: request.url,
        userId: user?.id,
      });
      // Don't re-throw - this ensures the main application continues
    }
  }

  private shouldSkipLogging(request: Request): boolean {
    const skipPaths = [
      '/api/health',
      '/api/docs',
      '/api/docs-json',
      '/static',
      '/favicon.ico',
      '/api/activity-logs', // Skip logging activity log requests to prevent infinite loops
      '/api/auth/me', // Skip logging for /me endpoint (get current user info)
      '/api/notifications/unread-count', // Skip frequent notification checks
      '/api/auth/super-admin/login', // Skip super admin login (manual logging)
      '/api/auth/school-admin/login', // Skip school admin login (manual logging)
      '/api/auth/student/login', // Skip student login (manual logging)
      '/api/auth/logout', // Skip logout (will be handled manually if needed)
    ];

    return skipPaths.some((path) => request.url.startsWith(path));
  }

  private determineActivityType(request: Request): ActivityTypeEnum {
    const { method, url } = request;
    const path = url.split('?')[0]; // Remove query parameters

    // Debug logging to see what paths are being processed
    this.logger.debug(`Processing request: ${method} ${path}`);
    this.logger.debug(`Full URL: ${url}`);
    this.logger.debug(`Path after split: ${path}`);

    if (path.includes('/auth/logout')) {
      this.logger.debug(`Auth logout detected: ${path}`);
      return ActivityTypeEnum.USER_LOGOUT;
    }

    // Progress tracking activities (check this first for more specific detection)
    if (path.includes('/progress')) {
      this.logger.debug(`Progress endpoint detected: ${path}`);
      this.logger.debug(`Checking progress sub-paths...`);

      if (path.includes('/modules/start')) {
        this.logger.debug(`Module start detected: ${path}`);
        return ActivityTypeEnum.MODULE_STARTED;
      }
      if (path.includes('/chapters/start')) {
        this.logger.debug(`Chapter start detected: ${path}`);
        return ActivityTypeEnum.CHAPTER_STARTED;
      }
      if (path.includes('/chapters/complete')) {
        this.logger.debug(`Chapter complete detected: ${path}`);
        return ActivityTypeEnum.CHAPTER_COMPLETED;
      }
      if (path.includes('/quiz/start')) {
        this.logger.debug(`Quiz start detected: ${path}`);
        return ActivityTypeEnum.QUIZ_STARTED;
      }
      if (path.includes('/quiz/submit')) {
        this.logger.debug(`Quiz submit detected: ${path}`);
        return ActivityTypeEnum.QUIZ_SUBMITTED;
      }
      if (method === 'PATCH' || method === 'PUT') {
        this.logger.debug(`Progress update detected: ${method} ${path}`);
        return ActivityTypeEnum.PROGRESS_UPDATED;
      }

      // Fallback for other progress endpoints
      if (method === 'POST') {
        this.logger.debug(
          `Progress POST endpoint detected, using PROGRESS_UPDATED: ${path}`,
        );
        return ActivityTypeEnum.PROGRESS_UPDATED;
      }

      this.logger.debug(
        `Progress endpoint detected but no specific activity type matched: ${path}`,
      );
    }

    // User management activities
    if (path.includes('/students') || path.includes('/professors')) {
      if (method === 'POST') return ActivityTypeEnum.USER_CREATED;
      if (method === 'PATCH' || method === 'PUT')
        return ActivityTypeEnum.USER_UPDATED;
      if (method === 'DELETE') return ActivityTypeEnum.USER_DELETED;
    }

    // Student management activities
    if (path.includes('/students')) {
      if (method === 'POST') return ActivityTypeEnum.STUDENT_CREATED;
      if (method === 'PATCH' || method === 'PUT')
        return ActivityTypeEnum.STUDENT_UPDATED;
      if (method === 'DELETE') return ActivityTypeEnum.STUDENT_DELETED;
      if (path.includes('/bulk-import'))
        return ActivityTypeEnum.STUDENT_BULK_IMPORT;
    }

    // Professor management activities
    if (path.includes('/professor')) {
      if (method === 'POST') return ActivityTypeEnum.PROFESSOR_CREATED;
      if (method === 'PATCH' || method === 'PUT')
        return ActivityTypeEnum.PROFESSOR_UPDATED;
      if (method === 'DELETE') return ActivityTypeEnum.PROFESSOR_DELETED;
    }

    // School management activities
    if (path.includes('/schools') || path.includes('/school-admin')) {
      if (method === 'POST') return ActivityTypeEnum.SCHOOL_CREATED;
      if (method === 'PATCH' || method === 'PUT')
        return ActivityTypeEnum.SCHOOL_UPDATED;
      if (method === 'DELETE') return ActivityTypeEnum.SCHOOL_DELETED;
    }

    // Module management activities
    if (path.includes('/modules')) {
      if (method === 'POST') return ActivityTypeEnum.MODULE_CREATED;
      if (method === 'PATCH' || method === 'PUT')
        return ActivityTypeEnum.MODULE_UPDATED;
      if (method === 'DELETE') return ActivityTypeEnum.MODULE_DELETED;
      if (path.includes('/assign')) return ActivityTypeEnum.MODULE_ASSIGNED;
      if (path.includes('/unassign')) return ActivityTypeEnum.MODULE_UNASSIGNED;
    }

    // Chapter management activities
    if (path.includes('/chapters')) {
      if (method === 'POST') return ActivityTypeEnum.CHAPTER_CREATED;
      if (method === 'PATCH' || method === 'PUT')
        return ActivityTypeEnum.CHAPTER_UPDATED;
      if (method === 'DELETE') return ActivityTypeEnum.CHAPTER_DELETED;
      if (path.includes('/reorder')) return ActivityTypeEnum.CHAPTER_REORDERED;
    }

    // Quiz activities
    if (path.includes('/quiz')) {
      if (method === 'POST' && path.includes('/groups'))
        return ActivityTypeEnum.QUIZ_CREATED;
      if (method === 'PATCH' || method === 'PUT')
        return ActivityTypeEnum.QUIZ_UPDATED;
      if (method === 'DELETE') return ActivityTypeEnum.QUIZ_DELETED;
      if (path.includes('/attempt')) return ActivityTypeEnum.QUIZ_ATTEMPTED;
    }

    // AI Chat activities
    if (path.includes('/ai-chat')) {
      if (method === 'POST' && path.includes('/sessions'))
        return ActivityTypeEnum.AI_CHAT_STARTED;
      if (method === 'POST' && path.includes('/messages'))
        return ActivityTypeEnum.AI_CHAT_MESSAGE_SENT;
      if (method === 'POST' && path.includes('/feedback'))
        return ActivityTypeEnum.AI_FEEDBACK_GIVEN;
    }

    // File upload activities
    if (path.includes('/upload')) {
      if (method === 'POST') return ActivityTypeEnum.FILE_UPLOADED;
      if (method === 'DELETE') return ActivityTypeEnum.FILE_DELETED;
    }

    // Log what we're about to return as default
    this.logger.debug(
      `No specific activity type matched, using default for ${method} ${path}`,
    );

    // Return SYSTEM_MAINTENANCE for unmatched requests (will be skipped from logging)
    return ActivityTypeEnum.SYSTEM_MAINTENANCE;
  }

  private generateDescription(
    request: Request,
    activityType: ActivityTypeEnum,
    isSuccess: boolean,
  ): MultiLanguageDescription {
    const descriptions = getActivityDescription(activityType, isSuccess);

    return {
      en: descriptions.en,
      fr: descriptions.fr,
    };
  }

  private extractMetadata(
    request: Request,
    response: Response,
    activityType: ActivityTypeEnum,
  ): Record<string, any> {
    const metadata: Record<string, any> = {};

    try {
      // Extract school information
      if (request.user) {
        const user = request.user as JWTUserPayload;
        metadata.school_id = user.school_id;
      }

      // Extract target user information from request body or params
      if (request.body?.email) {
        metadata.target_user_email = request.body.email;
      }
      if (request.params?.id) {
        metadata.target_user_id = request.params.id;
      }

      // Extract module information for module-related activities
      if (this.isModuleRelatedActivity(activityType)) {
        if (request.params?.module_id) {
          metadata.module_id = request.params.module_id;
        }
        if (request.body?.module_id) {
          metadata.module_id = request.body.module_id;
        }
        if (request.body?.module_name) {
          metadata.module_name = request.body.module_name;
        }
        if (request.query?.module_id) {
          metadata.module_id = request.query.module_id;
        }
      }

      // Extract chapter information for chapter-related activities
      if (this.isChapterRelatedActivity(activityType)) {
        if (request.params?.chapter_id) {
          metadata.chapter_id = request.params.chapter_id;
        }
        if (request.body?.chapter_id) {
          metadata.chapter_id = request.body.chapter_id;
        }
        if (request.body?.chapter_name) {
          metadata.chapter_name = request.body.chapter_name;
        }
      }

      // Extract quiz information for quiz-related activities
      if (this.isQuizRelatedActivity(activityType)) {
        if (request.params?.quiz_group_id) {
          metadata.quiz_group_id = request.params.quiz_group_id;
        }
        if (request.body?.quiz_group_id) {
          metadata.quiz_group_id = request.body.quiz_group_id;
        }
        // Extract attempt_id for quiz submission
        if (request.body?.attempt_id) {
          metadata.attempt_id = request.body.attempt_id;
        }
        // Extract score and performance data for quiz submission
        if (request.body?.score_percentage !== undefined) {
          metadata.score_percentage = request.body.score_percentage;
        }
        if (request.body?.correct_answers !== undefined) {
          metadata.correct_answers = request.body.correct_answers;
        }
        if (request.body?.total_questions !== undefined) {
          metadata.total_questions = request.body.total_questions;
        }
        if (request.body?.is_passed !== undefined) {
          metadata.is_passed = request.body.is_passed;
        }
        if (request.body?.time_taken_seconds !== undefined) {
          metadata.time_taken_seconds = request.body.time_taken_seconds;
        }
      }

      // Extract progress-specific information
      if (this.isProgressRelatedActivity(activityType)) {
        // For progress activities, extract module_id and chapter_id from body
        if (request.body?.module_id) {
          metadata.module_id = request.body.module_id;
        }
        if (request.body?.chapter_id) {
          metadata.chapter_id = request.body.chapter_id;
        }
        if (request.body?.quiz_group_id) {
          metadata.quiz_group_id = request.body.quiz_group_id;
        }

        // Extract progress status and completion information
        if (request.body?.status) {
          metadata.progress_status = request.body.status;
        }
        if (request.body?.started_at) {
          metadata.started_at = request.body.started_at;
        }
        if (request.body?.completed_at) {
          metadata.completed_at = request.body.completed_at;
        }
        if (request.body?.progress_percentage !== undefined) {
          metadata.progress_percentage = request.body.progress_percentage;
        }
        if (request.body?.chapters_completed !== undefined) {
          metadata.chapters_completed = request.body.chapters_completed;
        }
        if (request.body?.total_chapters !== undefined) {
          metadata.total_chapters = request.body.total_chapters;
        }
        if (request.body?.chapter_sequence !== undefined) {
          metadata.chapter_sequence = request.body.chapter_sequence;
        }
        if (request.body?.chapter_quiz_completed !== undefined) {
          metadata.chapter_quiz_completed = request.body.chapter_quiz_completed;
        }
      }
    } catch (error) {
      // If metadata extraction fails, just log it and continue
      this.logger.debug('Error extracting metadata:', error.message);
    }

    return metadata;
  }

  private isModuleRelatedActivity(activityType: ActivityTypeEnum): boolean {
    return [
      ActivityTypeEnum.MODULE_CREATED,
      ActivityTypeEnum.MODULE_UPDATED,
      ActivityTypeEnum.MODULE_DELETED,
      ActivityTypeEnum.MODULE_ASSIGNED,
      ActivityTypeEnum.MODULE_UNASSIGNED,
      ActivityTypeEnum.CHAPTER_CREATED,
      ActivityTypeEnum.CHAPTER_UPDATED,
      ActivityTypeEnum.CHAPTER_DELETED,
      ActivityTypeEnum.CHAPTER_REORDERED,
      ActivityTypeEnum.QUIZ_CREATED,
      ActivityTypeEnum.QUIZ_UPDATED,
      ActivityTypeEnum.QUIZ_DELETED,
      ActivityTypeEnum.QUIZ_ATTEMPTED,
      ActivityTypeEnum.QUIZ_STARTED,
      ActivityTypeEnum.QUIZ_SUBMITTED,
      ActivityTypeEnum.MODULE_STARTED,
      ActivityTypeEnum.MODULE_COMPLETED,
    ].includes(activityType);
  }

  private isChapterRelatedActivity(activityType: ActivityTypeEnum): boolean {
    return [
      ActivityTypeEnum.CHAPTER_CREATED,
      ActivityTypeEnum.CHAPTER_UPDATED,
      ActivityTypeEnum.CHAPTER_DELETED,
      ActivityTypeEnum.CHAPTER_REORDERED,
      ActivityTypeEnum.QUIZ_CREATED,
      ActivityTypeEnum.QUIZ_UPDATED,
      ActivityTypeEnum.QUIZ_DELETED,
      ActivityTypeEnum.QUIZ_ATTEMPTED,
      ActivityTypeEnum.QUIZ_STARTED,
      ActivityTypeEnum.QUIZ_SUBMITTED,
      ActivityTypeEnum.CHAPTER_STARTED,
      ActivityTypeEnum.CHAPTER_COMPLETED,
    ].includes(activityType);
  }

  private isQuizRelatedActivity(activityType: ActivityTypeEnum): boolean {
    return [
      ActivityTypeEnum.QUIZ_CREATED,
      ActivityTypeEnum.QUIZ_UPDATED,
      ActivityTypeEnum.QUIZ_DELETED,
      ActivityTypeEnum.QUIZ_ATTEMPTED,
      ActivityTypeEnum.QUIZ_STARTED,
      ActivityTypeEnum.QUIZ_SUBMITTED,
    ].includes(activityType);
  }

  private isProgressRelatedActivity(activityType: ActivityTypeEnum): boolean {
    return [
      ActivityTypeEnum.MODULE_STARTED,
      ActivityTypeEnum.MODULE_COMPLETED,
      ActivityTypeEnum.CHAPTER_STARTED,
      ActivityTypeEnum.CHAPTER_COMPLETED,
      ActivityTypeEnum.QUIZ_ATTEMPTED,
      ActivityTypeEnum.QUIZ_STARTED,
      ActivityTypeEnum.QUIZ_SUBMITTED,
      ActivityTypeEnum.PROGRESS_UPDATED,
      ActivityTypeEnum.PROGRESS_COMPLETED,
    ].includes(activityType);
  }

  private sanitizeRequestBody(body: any): any {
    if (!body) return null;

    try {
      const sanitized = { ...body };

      // Remove sensitive fields
      const sensitiveFields = [
        'password',
        'token',
        'secret',
        'key',
        'authorization',
        'access_token',
        'refresh_token',
        'api_key',
        'private_key',
        'secret_key',
      ];
      sensitiveFields.forEach((field) => {
        if (sanitized[field]) {
          sanitized[field] = '[REDACTED]';
        }
      });

      return sanitized;
    } catch (error) {
      // If sanitization fails, return null
      this.logger.debug('Error sanitizing request body:', error.message);
      return null;
    }
  }

  private getClientIp(request: Request): string {
    try {
      return (
        request.ip ||
        (request.connection as any).remoteAddress ||
        (request.socket as any).remoteAddress ||
        request.headers['x-forwarded-for'] ||
        request.headers['x-real-ip'] ||
        'unknown'
      );
    } catch (error) {
      this.logger.debug('Error getting client IP:', error.message);
      return 'unknown';
    }
  }
}
