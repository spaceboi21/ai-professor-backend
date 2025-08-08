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
import { LanguageEnum } from 'src/common/constants/language.constant';

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

      const descriptions = this.generateBilingualDescription(
        request,
        activityType,
        isSuccess,
        user.preferred_language,
      );
      const metadata = this.extractMetadata(request, response, activityType);

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
      '/api/queue', // Skip queue monitoring endpoints
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
    if (path.includes('/users')) {
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

    // Anchor Tag activities
    if (path.includes('/anchor-tags')) {
      if (method === 'POST') return ActivityTypeEnum.ANCHOR_TAG_CREATED;
      if (method === 'PATCH' || method === 'PUT')
        return ActivityTypeEnum.ANCHOR_TAG_UPDATED;
      if (method === 'DELETE') return ActivityTypeEnum.ANCHOR_TAG_DELETED;
      if (path.includes('/attempt/start'))
        return ActivityTypeEnum.ANCHOR_TAG_ATTEMPT_STARTED;
      if (path.includes('/attempt/complete'))
        return ActivityTypeEnum.ANCHOR_TAG_ATTEMPT_COMPLETED;
      if (path.includes('/skip')) return ActivityTypeEnum.ANCHOR_TAG_SKIPPED;
    }

    // Progress activities
    if (path.includes('/progress')) {
      if (method === 'PATCH' || method === 'PUT')
        return ActivityTypeEnum.PROGRESS_UPDATED;
      if (path.includes('/complete'))
        return ActivityTypeEnum.PROGRESS_COMPLETED;
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

    // Bibliography activities
    if (path.includes('/bibliography')) {
      if (method === 'POST') return ActivityTypeEnum.FILE_UPLOADED; // Bibliography items are files
      if (method === 'PATCH' || method === 'PUT')
        return ActivityTypeEnum.FILE_UPLOADED;
      if (method === 'DELETE') return ActivityTypeEnum.FILE_DELETED;
    }

    // Learning logs activities
    if (path.includes('/learning-logs')) {
      if (method === 'POST') return ActivityTypeEnum.PROGRESS_UPDATED;
      if (method === 'PATCH' || method === 'PUT')
        return ActivityTypeEnum.PROGRESS_UPDATED;
    }

    // Notification activities
    if (path.includes('/notifications')) {
      if (method === 'POST') return ActivityTypeEnum.NOTIFICATION_SENT;
      if (method === 'PATCH' || method === 'PUT')
        return ActivityTypeEnum.NOTIFICATION_READ;
    }

    // Community activities
    if (path.includes('/community') || path.includes('/chat')) {
      if (method === 'POST') return ActivityTypeEnum.USER_CREATED; // Community posts/messages
      if (method === 'PATCH' || method === 'PUT')
        return ActivityTypeEnum.USER_UPDATED;
      if (method === 'DELETE') return ActivityTypeEnum.USER_DELETED;
    }

    // Super admin activities
    if (path.includes('/super-admin')) {
      if (method === 'POST') return ActivityTypeEnum.USER_CREATED;
      if (method === 'PATCH' || method === 'PUT')
        return ActivityTypeEnum.USER_UPDATED;
      if (method === 'DELETE') return ActivityTypeEnum.USER_DELETED;
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

  private generateBilingualDescription(
    request: Request,
    activityType: ActivityTypeEnum,
    isSuccess: boolean,
    preferredLanguage: LanguageEnum = LanguageEnum.FRENCH,
  ): { primary: string; english: string; french: string } {
    const { method, url } = request;
    const path = url.split('?')[0];
    const status = isSuccess ? 'successfully' : 'failed';
    const statusFr = isSuccess ? 'avec succès' : 'échoué';

    const descriptions = this.getActivityDescriptions(
      activityType,
      status,
      statusFr,
    );

    // Determine primary description based on user's preferred language
    const primary =
      preferredLanguage === LanguageEnum.ENGLISH
        ? descriptions.english
        : descriptions.french;

    return {
      primary,
      english: descriptions.english,
      french: descriptions.french,
    };
  }

  private getActivityDescriptions(
    activityType: ActivityTypeEnum,
    status: string,
    statusFr: string,
  ): { english: string; french: string } {
    switch (activityType) {
      case ActivityTypeEnum.USER_LOGIN:
        return {
          english: `User login ${status}`,
          french: `Connexion utilisateur ${statusFr}`,
        };
      case ActivityTypeEnum.USER_LOGOUT:
        return {
          english: `User logout ${status}`,
          french: `Déconnexion utilisateur ${statusFr}`,
        };
      case ActivityTypeEnum.USER_CREATED:
        return {
          english: `User creation ${status}`,
          french: `Création d'utilisateur ${statusFr}`,
        };
      case ActivityTypeEnum.USER_UPDATED:
        return {
          english: `User update ${status}`,
          french: `Mise à jour d'utilisateur ${statusFr}`,
        };
      case ActivityTypeEnum.USER_DELETED:
        return {
          english: `User deletion ${status}`,
          french: `Suppression d'utilisateur ${statusFr}`,
        };
      case ActivityTypeEnum.USER_STATUS_CHANGED:
        return {
          english: `User status change ${status}`,
          french: `Changement de statut utilisateur ${statusFr}`,
        };
      case ActivityTypeEnum.PASSWORD_CHANGED:
        return {
          english: `Password change ${status}`,
          french: `Changement de mot de passe ${statusFr}`,
        };
      case ActivityTypeEnum.PASSWORD_RESET:
        return {
          english: `Password reset ${status}`,
          french: `Réinitialisation de mot de passe ${statusFr}`,
        };
      case ActivityTypeEnum.SCHOOL_CREATED:
        return {
          english: `School creation ${status}`,
          french: `Création d'école ${statusFr}`,
        };
      case ActivityTypeEnum.SCHOOL_UPDATED:
        return {
          english: `School update ${status}`,
          french: `Mise à jour d'école ${statusFr}`,
        };
      case ActivityTypeEnum.SCHOOL_DELETED:
        return {
          english: `School deletion ${status}`,
          french: `Suppression d'école ${statusFr}`,
        };
      case ActivityTypeEnum.SCHOOL_STATUS_CHANGED:
        return {
          english: `School status change ${status}`,
          french: `Changement de statut d'école ${statusFr}`,
        };
      case ActivityTypeEnum.STUDENT_CREATED:
        return {
          english: `Student creation ${status}`,
          french: `Création d'étudiant ${statusFr}`,
        };
      case ActivityTypeEnum.STUDENT_UPDATED:
        return {
          english: `Student update ${status}`,
          french: `Mise à jour d'étudiant ${statusFr}`,
        };
      case ActivityTypeEnum.STUDENT_DELETED:
        return {
          english: `Student deletion ${status}`,
          french: `Suppression d'étudiant ${statusFr}`,
        };
      case ActivityTypeEnum.STUDENT_STATUS_CHANGED:
        return {
          english: `Student status change ${status}`,
          french: `Changement de statut d'étudiant ${statusFr}`,
        };
      case ActivityTypeEnum.STUDENT_BULK_IMPORT:
        return {
          english: `Student bulk import ${status}`,
          french: `Import en masse d'étudiants ${statusFr}`,
        };
      case ActivityTypeEnum.PROFESSOR_CREATED:
        return {
          english: `Professor creation ${status}`,
          french: `Création de professeur ${statusFr}`,
        };
      case ActivityTypeEnum.PROFESSOR_UPDATED:
        return {
          english: `Professor update ${status}`,
          french: `Mise à jour de professeur ${statusFr}`,
        };
      case ActivityTypeEnum.PROFESSOR_DELETED:
        return {
          english: `Professor deletion ${status}`,
          french: `Suppression de professeur ${statusFr}`,
        };
      case ActivityTypeEnum.PROFESSOR_STATUS_CHANGED:
        return {
          english: `Professor status change ${status}`,
          french: `Changement de statut de professeur ${statusFr}`,
        };
      case ActivityTypeEnum.MODULE_CREATED:
        return {
          english: `Module creation ${status}`,
          french: `Création de module ${statusFr}`,
        };
      case ActivityTypeEnum.MODULE_UPDATED:
        return {
          english: `Module update ${status}`,
          french: `Mise à jour de module ${statusFr}`,
        };
      case ActivityTypeEnum.MODULE_DELETED:
        return {
          english: `Module deletion ${status}`,
          french: `Suppression de module ${statusFr}`,
        };
      case ActivityTypeEnum.MODULE_ASSIGNED:
        return {
          english: `Module assignment ${status}`,
          french: `Attribution de module ${statusFr}`,
        };
      case ActivityTypeEnum.MODULE_UNASSIGNED:
        return {
          english: `Module unassignment ${status}`,
          french: `Désattribution de module ${statusFr}`,
        };
      case ActivityTypeEnum.CHAPTER_CREATED:
        return {
          english: `Chapter creation ${status}`,
          french: `Création de chapitre ${statusFr}`,
        };
      case ActivityTypeEnum.CHAPTER_UPDATED:
        return {
          english: `Chapter update ${status}`,
          french: `Mise à jour de chapitre ${statusFr}`,
        };
      case ActivityTypeEnum.CHAPTER_DELETED:
        return {
          english: `Chapter deletion ${status}`,
          french: `Suppression de chapitre ${statusFr}`,
        };
      case ActivityTypeEnum.CHAPTER_REORDERED:
        return {
          english: `Chapter reordering ${status}`,
          french: `Réorganisation de chapitres ${statusFr}`,
        };
      case ActivityTypeEnum.QUIZ_CREATED:
        return {
          english: `Quiz creation ${status}`,
          french: `Création de quiz ${statusFr}`,
        };
      case ActivityTypeEnum.QUIZ_UPDATED:
        return {
          english: `Quiz update ${status}`,
          french: `Mise à jour de quiz ${statusFr}`,
        };
      case ActivityTypeEnum.QUIZ_DELETED:
        return {
          english: `Quiz deletion ${status}`,
          french: `Suppression de quiz ${statusFr}`,
        };
      case ActivityTypeEnum.QUIZ_ATTEMPTED:
        return {
          english: `Quiz attempt ${status}`,
          french: `Tentative de quiz ${statusFr}`,
        };
      case ActivityTypeEnum.ANCHOR_TAG_CREATED:
        return {
          english: `Anchor tag creation ${status}`,
          french: `Création de balise d'ancrage ${statusFr}`,
        };
      case ActivityTypeEnum.ANCHOR_TAG_UPDATED:
        return {
          english: `Anchor tag update ${status}`,
          french: `Mise à jour de balise d'ancrage ${statusFr}`,
        };
      case ActivityTypeEnum.ANCHOR_TAG_DELETED:
        return {
          english: `Anchor tag deletion ${status}`,
          french: `Suppression de balise d'ancrage ${statusFr}`,
        };
      case ActivityTypeEnum.ANCHOR_TAG_ATTEMPT_STARTED:
        return {
          english: `Anchor tag attempt started ${status}`,
          french: `Tentative de balise d'ancrage commencée ${statusFr}`,
        };
      case ActivityTypeEnum.ANCHOR_TAG_ATTEMPT_COMPLETED:
        return {
          english: `Anchor tag attempt completed ${status}`,
          french: `Tentative de balise d'ancrage terminée ${statusFr}`,
        };
      case ActivityTypeEnum.ANCHOR_TAG_SKIPPED:
        return {
          english: `Anchor tag skipped ${status}`,
          french: `Balise d'ancrage ignorée ${statusFr}`,
        };
      case ActivityTypeEnum.PROGRESS_UPDATED:
        return {
          english: `Progress update ${status}`,
          french: `Mise à jour de progression ${statusFr}`,
        };
      case ActivityTypeEnum.PROGRESS_COMPLETED:
        return {
          english: `Progress completion ${status}`,
          french: `Finalisation de progression ${statusFr}`,
        };
      case ActivityTypeEnum.AI_CHAT_STARTED:
        return {
          english: `AI chat session started ${status}`,
          french: `Session de chat IA commencée ${statusFr}`,
        };
      case ActivityTypeEnum.AI_CHAT_MESSAGE_SENT:
        return {
          english: `AI chat message sent ${status}`,
          french: `Message de chat IA envoyé ${statusFr}`,
        };
      case ActivityTypeEnum.AI_FEEDBACK_GIVEN:
        return {
          english: `AI feedback provided ${status}`,
          french: `Retour IA fourni ${statusFr}`,
        };
      case ActivityTypeEnum.FILE_UPLOADED:
        return {
          english: `File upload ${status}`,
          french: `Téléchargement de fichier ${statusFr}`,
        };
      case ActivityTypeEnum.FILE_DELETED:
        return {
          english: `File deletion ${status}`,
          french: `Suppression de fichier ${statusFr}`,
        };
      case ActivityTypeEnum.NOTIFICATION_SENT:
        return {
          english: `Notification sent ${status}`,
          french: `Notification envoyée ${statusFr}`,
        };
      case ActivityTypeEnum.NOTIFICATION_READ:
        return {
          english: `Notification read ${status}`,
          french: `Notification lue ${statusFr}`,
        };
      case ActivityTypeEnum.LOGIN_FAILED:
        return {
          english: `Login failed`,
          french: `Échec de connexion`,
        };
      case ActivityTypeEnum.UNAUTHORIZED_ACCESS:
        return {
          english: `Unauthorized access attempt`,
          french: `Tentative d'accès non autorisé`,
        };
      case ActivityTypeEnum.SUSPICIOUS_ACTIVITY:
        return {
          english: `Suspicious activity detected`,
          french: `Activité suspecte détectée`,
        };
      default:
        return {
          english: `Activity ${status}`,
          french: `Activité ${statusFr}`,
        };
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
      case ActivityTypeEnum.USER_STATUS_CHANGED:
        return `User status change ${status}`;
      case ActivityTypeEnum.PASSWORD_CHANGED:
        return `Password change ${status}`;
      case ActivityTypeEnum.PASSWORD_RESET:
        return `Password reset ${status}`;
      case ActivityTypeEnum.SCHOOL_CREATED:
        return `School creation ${status}`;
      case ActivityTypeEnum.SCHOOL_UPDATED:
        return `School update ${status}`;
      case ActivityTypeEnum.SCHOOL_DELETED:
        return `School deletion ${status}`;
      case ActivityTypeEnum.SCHOOL_STATUS_CHANGED:
        return `School status change ${status}`;
      case ActivityTypeEnum.STUDENT_CREATED:
        return `Student creation ${status}`;
      case ActivityTypeEnum.STUDENT_UPDATED:
        return `Student update ${status}`;
      case ActivityTypeEnum.STUDENT_DELETED:
        return `Student deletion ${status}`;
      case ActivityTypeEnum.STUDENT_STATUS_CHANGED:
        return `Student status change ${status}`;
      case ActivityTypeEnum.STUDENT_BULK_IMPORT:
        return `Student bulk import ${status}`;
      case ActivityTypeEnum.PROFESSOR_CREATED:
        return `Professor creation ${status}`;
      case ActivityTypeEnum.PROFESSOR_UPDATED:
        return `Professor update ${status}`;
      case ActivityTypeEnum.PROFESSOR_DELETED:
        return `Professor deletion ${status}`;
      case ActivityTypeEnum.PROFESSOR_STATUS_CHANGED:
        return `Professor status change ${status}`;
      case ActivityTypeEnum.MODULE_CREATED:
        return `Module creation ${status}`;
      case ActivityTypeEnum.MODULE_UPDATED:
        return `Module update ${status}`;
      case ActivityTypeEnum.MODULE_DELETED:
        return `Module deletion ${status}`;
      case ActivityTypeEnum.MODULE_ASSIGNED:
        return `Module assignment ${status}`;
      case ActivityTypeEnum.MODULE_UNASSIGNED:
        return `Module unassignment ${status}`;
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
      case ActivityTypeEnum.ANCHOR_TAG_CREATED:
        return `Anchor tag creation ${status}`;
      case ActivityTypeEnum.ANCHOR_TAG_UPDATED:
        return `Anchor tag update ${status}`;
      case ActivityTypeEnum.ANCHOR_TAG_DELETED:
        return `Anchor tag deletion ${status}`;
      case ActivityTypeEnum.ANCHOR_TAG_ATTEMPT_STARTED:
        return `Anchor tag attempt started ${status}`;
      case ActivityTypeEnum.ANCHOR_TAG_ATTEMPT_COMPLETED:
        return `Anchor tag attempt completed ${status}`;
      case ActivityTypeEnum.ANCHOR_TAG_SKIPPED:
        return `Anchor tag skipped ${status}`;
      case ActivityTypeEnum.PROGRESS_UPDATED:
        return `Progress update ${status}`;
      case ActivityTypeEnum.PROGRESS_COMPLETED:
        return `Progress completion ${status}`;
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
      case ActivityTypeEnum.NOTIFICATION_SENT:
        return `Notification sent ${status}`;
      case ActivityTypeEnum.NOTIFICATION_READ:
        return `Notification read ${status}`;
      case ActivityTypeEnum.LOGIN_FAILED:
        return `Login failed`;
      case ActivityTypeEnum.UNAUTHORIZED_ACCESS:
        return `Unauthorized access attempt`;
      case ActivityTypeEnum.SUSPICIOUS_ACTIVITY:
        return `Suspicious activity detected`;
      default:
        return `${method} ${path} ${status}`;
    }
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
      if (request.body?.student_id) {
        metadata.target_user_id = request.body.student_id;
      }
      if (request.body?.professor_id) {
        metadata.target_user_id = request.body.professor_id;
      }

      // Extract role information
      if (request.body?.role) {
        metadata.target_user_role = request.body.role;
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
        if (request.query?.chapter_id) {
          metadata.chapter_id = request.query.chapter_id;
        }
      }

      // Extract quiz information
      if (this.isQuizRelatedActivity(activityType)) {
        if (request.params?.quiz_id) {
          metadata.quiz_id = request.params.quiz_id;
        }
        if (request.body?.quiz_id) {
          metadata.quiz_id = request.body.quiz_id;
        }
        if (request.body?.quiz_group_id) {
          metadata.quiz_group_id = request.body.quiz_group_id;
        }
      }

      // Extract anchor tag information
      if (this.isAnchorTagRelatedActivity(activityType)) {
        if (request.params?.anchor_tag_id) {
          metadata.anchor_tag_id = request.params.anchor_tag_id;
        }
        if (request.body?.anchor_tag_id) {
          metadata.anchor_tag_id = request.body.anchor_tag_id;
        }
      }

      // Extract AI chat information
      if (this.isAIChatRelatedActivity(activityType)) {
        if (request.params?.session_id) {
          metadata.session_id = request.params.session_id;
        }
        if (request.body?.session_id) {
          metadata.session_id = request.body.session_id;
        }
        if (request.body?.message_id) {
          metadata.message_id = request.body.message_id;
        }
      }

      // Extract file information
      if (this.isFileRelatedActivity(activityType)) {
        if (request.params?.file_id) {
          metadata.file_id = request.params.file_id;
        }
        if (request.body?.file_id) {
          metadata.file_id = request.body.file_id;
        }
        if (request.body?.filename) {
          metadata.filename = request.body.filename;
        }
      }

      // Extract progress information
      if (this.isProgressRelatedActivity(activityType)) {
        if (request.params?.progress_id) {
          metadata.progress_id = request.params.progress_id;
        }
        if (request.body?.progress_id) {
          metadata.progress_id = request.body.progress_id;
        }
        if (request.body?.completion_percentage) {
          metadata.completion_percentage = request.body.completion_percentage;
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
      ActivityTypeEnum.ANCHOR_TAG_CREATED,
      ActivityTypeEnum.ANCHOR_TAG_UPDATED,
      ActivityTypeEnum.ANCHOR_TAG_DELETED,
      ActivityTypeEnum.ANCHOR_TAG_ATTEMPT_STARTED,
      ActivityTypeEnum.ANCHOR_TAG_ATTEMPT_COMPLETED,
      ActivityTypeEnum.ANCHOR_TAG_SKIPPED,
      ActivityTypeEnum.AI_CHAT_STARTED,
      ActivityTypeEnum.AI_CHAT_MESSAGE_SENT,
      ActivityTypeEnum.AI_FEEDBACK_GIVEN,
      ActivityTypeEnum.PROGRESS_UPDATED,
      ActivityTypeEnum.PROGRESS_COMPLETED,
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
      ActivityTypeEnum.ANCHOR_TAG_CREATED,
      ActivityTypeEnum.ANCHOR_TAG_UPDATED,
      ActivityTypeEnum.ANCHOR_TAG_DELETED,
      ActivityTypeEnum.ANCHOR_TAG_ATTEMPT_STARTED,
      ActivityTypeEnum.ANCHOR_TAG_ATTEMPT_COMPLETED,
      ActivityTypeEnum.ANCHOR_TAG_SKIPPED,
      ActivityTypeEnum.AI_CHAT_STARTED,
      ActivityTypeEnum.AI_CHAT_MESSAGE_SENT,
      ActivityTypeEnum.AI_FEEDBACK_GIVEN,
      ActivityTypeEnum.PROGRESS_UPDATED,
      ActivityTypeEnum.PROGRESS_COMPLETED,
    ].includes(activityType);
  }

  private isQuizRelatedActivity(activityType: ActivityTypeEnum): boolean {
    return [
      ActivityTypeEnum.QUIZ_CREATED,
      ActivityTypeEnum.QUIZ_UPDATED,
      ActivityTypeEnum.QUIZ_DELETED,
      ActivityTypeEnum.QUIZ_ATTEMPTED,
    ].includes(activityType);
  }

  private isAnchorTagRelatedActivity(activityType: ActivityTypeEnum): boolean {
    return [
      ActivityTypeEnum.ANCHOR_TAG_CREATED,
      ActivityTypeEnum.ANCHOR_TAG_UPDATED,
      ActivityTypeEnum.ANCHOR_TAG_DELETED,
      ActivityTypeEnum.ANCHOR_TAG_ATTEMPT_STARTED,
      ActivityTypeEnum.ANCHOR_TAG_ATTEMPT_COMPLETED,
      ActivityTypeEnum.ANCHOR_TAG_SKIPPED,
    ].includes(activityType);
  }

  private isAIChatRelatedActivity(activityType: ActivityTypeEnum): boolean {
    return [
      ActivityTypeEnum.AI_CHAT_STARTED,
      ActivityTypeEnum.AI_CHAT_MESSAGE_SENT,
      ActivityTypeEnum.AI_FEEDBACK_GIVEN,
    ].includes(activityType);
  }

  private isFileRelatedActivity(activityType: ActivityTypeEnum): boolean {
    return [
      ActivityTypeEnum.FILE_UPLOADED,
      ActivityTypeEnum.FILE_DELETED,
    ].includes(activityType);
  }

  private isProgressRelatedActivity(activityType: ActivityTypeEnum): boolean {
    return [
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
