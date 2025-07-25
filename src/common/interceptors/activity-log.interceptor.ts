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
      return next.handle();
    }

    const startTime = Date.now();
    const activityType = this.determineActivityType(request);

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

      const description = this.generateDescription(
        request,
        activityType,
        isSuccess,
      );
      const metadata = this.extractMetadata(request, response);

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
        description,
        performed_by: new Types.ObjectId(user.id) as any,
        performed_by_role: user.role.name as RoleEnum,
        school_id: user.school_id as Types.ObjectId,
        school_name: metadata.school_name,
        target_user_id: new Types.ObjectId(metadata.target_user_id),
        target_user_email: metadata.target_user_email,
        target_user_role: metadata.target_user_role,
        module_id: new Types.ObjectId(metadata.module_id).toString(),
        module_name: metadata.module_name,
        chapter_id: new Types.ObjectId(metadata.chapter_id).toString(),
        chapter_name: metadata.chapter_name,
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
            await this.activityLogService.createActivityLog(
              createActivityLogDto,
            );
            this.logger.debug(`Activity logged successfully: ${activityType}`);
          } catch (logError) {
            // Log the error but don't throw - this prevents breaking the main application
            this.logger.error('Failed to log activity (non-critical):', {
              error: logError.message,
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
    ];

    return skipPaths.some((path) => request.url.startsWith(path));
  }

  private determineActivityType(request: Request): ActivityTypeEnum {
    const { method, url } = request;
    const path = url.split('?')[0]; // Remove query parameters

    // Authentication activities
    if (path.includes('/auth/login')) {
      return ActivityTypeEnum.USER_LOGIN;
    }
    if (path.includes('/auth/logout')) {
      return ActivityTypeEnum.USER_LOGOUT;
    }

    // User management activities
    if (
      path.includes('/users') ||
      path.includes('/students') ||
      path.includes('/professors')
    ) {
      if (method === 'POST') return ActivityTypeEnum.USER_CREATED;
      if (method === 'PATCH' || method === 'PUT')
        return ActivityTypeEnum.USER_UPDATED;
      if (method === 'DELETE') return ActivityTypeEnum.USER_DELETED;
    }

    // School management activities
    if (path.includes('/schools')) {
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
      if (path.includes('/assignments'))
        return ActivityTypeEnum.MODULE_ASSIGNED;
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
      if (method === 'POST') return ActivityTypeEnum.QUIZ_CREATED;
      if (method === 'PATCH' || method === 'PUT')
        return ActivityTypeEnum.QUIZ_UPDATED;
      if (method === 'DELETE') return ActivityTypeEnum.QUIZ_DELETED;
      if (path.includes('/attempt')) return ActivityTypeEnum.QUIZ_ATTEMPTED;
    }

    // Progress activities
    if (path.includes('/progress')) {
      if (method === 'PATCH' || method === 'PUT')
        return ActivityTypeEnum.PROGRESS_UPDATED;
    }

    // AI Chat activities
    if (path.includes('/ai-chat')) {
      if (method === 'POST' && path.includes('/start'))
        return ActivityTypeEnum.AI_CHAT_STARTED;
      if (method === 'POST' && path.includes('/message'))
        return ActivityTypeEnum.AI_CHAT_MESSAGE_SENT;
      if (method === 'POST' && path.includes('/feedback'))
        return ActivityTypeEnum.AI_FEEDBACK_GIVEN;
    }

    // File upload activities
    if (path.includes('/upload')) {
      if (method === 'POST') return ActivityTypeEnum.FILE_UPLOADED;
      if (method === 'DELETE') return ActivityTypeEnum.FILE_DELETED;
    }

    // Default activity type based on HTTP method
    switch (method) {
      case 'GET':
        return ActivityTypeEnum.USER_LOGIN; // Default for GET requests
      case 'POST':
        return ActivityTypeEnum.USER_CREATED; // Default for POST requests
      case 'PATCH':
      case 'PUT':
        return ActivityTypeEnum.USER_UPDATED; // Default for PUT/PATCH requests
      case 'DELETE':
        return ActivityTypeEnum.USER_DELETED; // Default for DELETE requests
      default:
        return ActivityTypeEnum.USER_LOGIN;
    }
  }

  private generateDescription(
    request: Request,
    activityType: ActivityTypeEnum,
    isSuccess: boolean,
  ): string {
    const { method, url } = request;
    const path = url.split('?')[0];
    const status = isSuccess ? 'successfully' : 'failed';

    switch (activityType) {
      case ActivityTypeEnum.USER_LOGIN:
        return `User login ${status}`;
      case ActivityTypeEnum.USER_LOGOUT:
        return `User logout ${status}`;
      case ActivityTypeEnum.USER_CREATED:
        return `User creation ${status}`;
      case ActivityTypeEnum.USER_UPDATED:
        return `User update ${status}`;
      case ActivityTypeEnum.USER_DELETED:
        return `User deletion ${status}`;
      case ActivityTypeEnum.SCHOOL_CREATED:
        return `School creation ${status}`;
      case ActivityTypeEnum.SCHOOL_UPDATED:
        return `School update ${status}`;
      case ActivityTypeEnum.SCHOOL_DELETED:
        return `School deletion ${status}`;
      case ActivityTypeEnum.MODULE_CREATED:
        return `Module creation ${status}`;
      case ActivityTypeEnum.MODULE_UPDATED:
        return `Module update ${status}`;
      case ActivityTypeEnum.MODULE_DELETED:
        return `Module deletion ${status}`;
      case ActivityTypeEnum.MODULE_ASSIGNED:
        return `Module assignment ${status}`;
      case ActivityTypeEnum.CHAPTER_CREATED:
        return `Chapter creation ${status}`;
      case ActivityTypeEnum.CHAPTER_UPDATED:
        return `Chapter update ${status}`;
      case ActivityTypeEnum.CHAPTER_DELETED:
        return `Chapter deletion ${status}`;
      case ActivityTypeEnum.CHAPTER_REORDERED:
        return `Chapter reordering ${status}`;
      case ActivityTypeEnum.QUIZ_CREATED:
        return `Quiz creation ${status}`;
      case ActivityTypeEnum.QUIZ_UPDATED:
        return `Quiz update ${status}`;
      case ActivityTypeEnum.QUIZ_DELETED:
        return `Quiz deletion ${status}`;
      case ActivityTypeEnum.QUIZ_ATTEMPTED:
        return `Quiz attempt ${status}`;
      case ActivityTypeEnum.PROGRESS_UPDATED:
        return `Progress update ${status}`;
      case ActivityTypeEnum.AI_CHAT_STARTED:
        return `AI chat session started ${status}`;
      case ActivityTypeEnum.AI_CHAT_MESSAGE_SENT:
        return `AI chat message sent ${status}`;
      case ActivityTypeEnum.AI_FEEDBACK_GIVEN:
        return `AI feedback provided ${status}`;
      case ActivityTypeEnum.FILE_UPLOADED:
        return `File upload ${status}`;
      case ActivityTypeEnum.FILE_DELETED:
        return `File deletion ${status}`;
      default:
        return `${method} ${path} ${status}`;
    }
  }

  private extractMetadata(
    request: Request,
    response: Response,
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

      // Extract module information
      if (request.params?.module_id) {
        metadata.module_id = request.params.module_id;
      }
      if (request.body?.module_name) {
        metadata.module_name = request.body.module_name;
      }

      // Extract chapter information
      if (request.params?.chapter_id) {
        metadata.chapter_id = request.params.chapter_id;
      }
      if (request.body?.chapter_name) {
        metadata.chapter_name = request.body.chapter_name;
      }
    } catch (error) {
      // If metadata extraction fails, just log it and continue
      this.logger.debug('Error extracting metadata:', error.message);
    }

    return metadata;
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
        'unknown'
      );
    } catch (error) {
      this.logger.debug('Error getting client IP:', error.message);
      return 'unknown';
    }
  }
}
