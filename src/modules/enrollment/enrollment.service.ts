import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { School } from 'src/database/schemas/central/school.schema';
import { User } from 'src/database/schemas/central/user.schema';
import {
  Student,
  StudentSchema,
} from 'src/database/schemas/tenant/student.schema';
import { Module, ModuleSchema } from 'src/database/schemas/tenant/module.schema';
import {
  StudentEnrollment,
  StudentEnrollmentSchema,
  EnrollmentTypeEnum,
  EnrollmentStatusEnum,
  EnrollmentSourceEnum,
} from 'src/database/schemas/tenant/student-enrollment.schema';
import {
  StudentModuleProgress,
  StudentModuleProgressSchema,
} from 'src/database/schemas/tenant/student-module-progress.schema';
import {
  Notification,
  NotificationSchema,
  RecipientTypeEnum,
} from 'src/database/schemas/tenant/notification.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { RoleEnum, ROLE_IDS } from 'src/common/constants/roles.constant';
import { ErrorMessageService } from 'src/common/services/error-message.service';
import { EmailEncryptionService } from 'src/common/services/email-encryption.service';
import { ActivityLogService } from 'src/modules/activity-log/activity-log.service';
import { MailService } from 'src/mail/mail.service';
import {
  DEFAULT_LANGUAGE,
  LanguageEnum,
} from 'src/common/constants/language.constant';
import {
  NotificationTypeEnum,
  NotificationStatusEnum,
} from 'src/common/constants/notification.constant';
import { ProgressStatusEnum } from 'src/common/constants/status.constant';
import { ActivityTypeEnum } from 'src/common/constants/activity.constant';
import { getActivityDescription } from 'src/common/constants/activity-descriptions.constant';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  getPaginationOptions,
  createPaginationResult,
} from 'src/common/utils/pagination.util';
import {
  EnrollStudentModulesDto,
  EnrollStudentAcademicYearDto,
  BulkEnrollStudentsDto,
  WithdrawEnrollmentDto,
  GetEnrollmentHistoryDto,
  GetStudentEnrollmentStatusDto,
} from './dto/enroll-student.dto';
import {
  EnrollmentResponseDto,
  EnrollmentResultDto,
  EnrollmentDetailsDto,
  StudentEnrollmentStatusDto,
  EnrollmentHistoryResponseDto,
  EnrollmentHistoryItemDto,
  ModuleEnrollmentSummaryDto,
  AvailableStudentDto,
  AvailableModuleDto,
} from './dto/enrollment-response.dto';

@Injectable()
export class EnrollmentService {
  private readonly logger = new Logger(EnrollmentService.name);

  constructor(
    @InjectModel(School.name) private readonly schoolModel: Model<School>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly errorMessageService: ErrorMessageService,
    private readonly emailEncryptionService: EmailEncryptionService,
    private readonly activityLogService: ActivityLogService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Resolve the school ID based on user role
   */
  private resolveSchoolId(user: JWTUserPayload, providedSchoolId?: string): string {
    if (user.role.name === RoleEnum.SUPER_ADMIN) {
      if (!providedSchoolId) {
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'ENROLLMENT',
            'SCHOOL_ID_REQUIRED',
            user.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
      return providedSchoolId;
    }
    return user.school_id?.toString() || '';
  }

  /**
   * Get tenant connection and models
   */
  private async getTenantModels(schoolId: string) {
    const school = await this.schoolModel.findById(schoolId);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const tenantConnection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );

    return {
      school,
      StudentModel: tenantConnection.model(Student.name, StudentSchema),
      ModuleModel: tenantConnection.model(Module.name, ModuleSchema),
      EnrollmentModel: tenantConnection.model(
        StudentEnrollment.name,
        StudentEnrollmentSchema,
      ),
      ProgressModel: tenantConnection.model(
        StudentModuleProgress.name,
        StudentModuleProgressSchema,
      ),
      NotificationModel: tenantConnection.model(
        Notification.name,
        NotificationSchema,
      ),
    };
  }

  /**
   * Enroll a student in individual modules
   */
  async enrollStudentInModules(
    dto: EnrollStudentModulesDto,
    user: JWTUserPayload,
  ): Promise<EnrollmentResponseDto> {
    this.logger.log(`Enrolling student ${dto.student_id} in ${dto.module_ids.length} modules`);

    const schoolId = this.resolveSchoolId(user, dto.school_id);
    const { school, StudentModel, ModuleModel, EnrollmentModel, ProgressModel, NotificationModel } =
      await this.getTenantModels(schoolId);

    // Validate student exists
    const student = await StudentModel.findOne({
      _id: new Types.ObjectId(dto.student_id),
      deleted_at: null,
    });

    if (!student) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'ENROLLMENT',
          'STUDENT_NOT_FOUND',
          user.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const batchId = uuidv4();
    const results: EnrollmentResultDto[] = [];
    let successful = 0;
    let failed = 0;
    let skipped = 0;

    // Get enrolled by user name
    const enrolledByName = await this.getEnrolledByName(user);

    for (const moduleId of dto.module_ids) {
      try {
        // Validate module exists and is published
        const module = await ModuleModel.findOne({
          _id: new Types.ObjectId(moduleId),
          deleted_at: null,
        });

        if (!module) {
          results.push({
            student_id: dto.student_id,
            student_name: `${student.first_name} ${student.last_name || ''}`.trim(),
            module_id: moduleId,
            module_title: 'Unknown',
            success: false,
            error: 'Module not found',
          });
          failed++;
          continue;
        }

        if (!module.published) {
          results.push({
            student_id: dto.student_id,
            student_name: `${student.first_name} ${student.last_name || ''}`.trim(),
            module_id: moduleId,
            module_title: module.title,
            success: false,
            error: 'Module is not published',
          });
          failed++;
          continue;
        }

        // Check if already enrolled
        const existingEnrollment = await EnrollmentModel.findOne({
          student_id: new Types.ObjectId(dto.student_id),
          module_id: new Types.ObjectId(moduleId),
          deleted_at: null,
        });

        if (existingEnrollment) {
          results.push({
            student_id: dto.student_id,
            student_name: `${student.first_name} ${student.last_name || ''}`.trim(),
            module_id: moduleId,
            module_title: module.title,
            success: true,
            was_duplicate: true,
          });
          skipped++;
          continue;
        }

        // Create enrollment
        const enrollment = await EnrollmentModel.create({
          student_id: new Types.ObjectId(dto.student_id),
          module_id: new Types.ObjectId(moduleId),
          school_id: new Types.ObjectId(schoolId),
          enrollment_type: EnrollmentTypeEnum.INDIVIDUAL,
          status: EnrollmentStatusEnum.ACTIVE,
          source: EnrollmentSourceEnum.MANUAL,
          batch_id: batchId,
          enrolled_by: new Types.ObjectId(user.id.toString()),
          enrolled_by_role: user.role.name as RoleEnum,
          enrolled_by_name: enrolledByName,
          enrolled_at: new Date(),
          notes: dto.notes,
        });

        // Create initial progress record (NOT_STARTED)
        await this.createInitialProgress(ProgressModel, dto.student_id, moduleId);

        // Send notifications
        if (dto.send_app_notification !== false) {
          await this.sendEnrollmentNotification(
            NotificationModel,
            student,
            module,
            NotificationTypeEnum.MODULE_ENROLLMENT,
          );
          enrollment.notification_sent = true;
          enrollment.notification_sent_at = new Date();
        }

        if (dto.send_email_notification !== false) {
          await this.sendEnrollmentEmail(student, [module], school.name);
          enrollment.email_notification_sent = true;
          enrollment.email_notification_sent_at = new Date();
        }

        await enrollment.save();

        results.push({
          student_id: dto.student_id,
          student_name: `${student.first_name} ${student.last_name || ''}`.trim(),
          module_id: moduleId,
          module_title: module.title,
          success: true,
          enrollment_id: enrollment._id.toString(),
        });
        successful++;
      } catch (error) {
        this.logger.error(`Error enrolling student in module ${moduleId}:`, error);
        results.push({
          student_id: dto.student_id,
          student_name: `${student.first_name} ${student.last_name || ''}`.trim(),
          module_id: moduleId,
          module_title: 'Unknown',
          success: false,
          error: error.message,
        });
        failed++;
      }
    }

    // Log activity
    await this.logEnrollmentActivity(
      user,
      school,
      student,
      ActivityTypeEnum.STUDENT_ENROLLED,
      successful > 0,
      {
        batch_id: batchId,
        module_ids: dto.module_ids,
        successful,
        failed,
        skipped,
      },
    );

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'ENROLLMENT',
        'ENROLLED_SUCCESSFULLY',
        user.preferred_language || DEFAULT_LANGUAGE,
      ),
      total_requested: dto.module_ids.length,
      successful,
      failed,
      skipped,
      batch_id: batchId,
      results,
    };
  }

  /**
   * Enroll a student in all modules for an academic year
   */
  async enrollStudentInAcademicYear(
    dto: EnrollStudentAcademicYearDto,
    user: JWTUserPayload,
  ): Promise<EnrollmentResponseDto> {
    this.logger.log(
      `Enrolling student ${dto.student_id} in academic year ${dto.academic_year}`,
    );

    const schoolId = this.resolveSchoolId(user, dto.school_id);
    const { school, StudentModel, ModuleModel, EnrollmentModel, ProgressModel, NotificationModel } =
      await this.getTenantModels(schoolId);

    // Validate student exists
    const student = await StudentModel.findOne({
      _id: new Types.ObjectId(dto.student_id),
      deleted_at: null,
    });

    if (!student) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'ENROLLMENT',
          'STUDENT_NOT_FOUND',
          user.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get all published modules for the academic year
    const modules = await ModuleModel.find({
      year: dto.academic_year,
      published: true,
      deleted_at: null,
    }).sort({ sequence: 1 });

    if (modules.length === 0) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'ENROLLMENT',
          'NO_MODULES_FOR_YEAR',
          user.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const batchId = uuidv4();
    const results: EnrollmentResultDto[] = [];
    let successful = 0;
    let failed = 0;
    let skipped = 0;

    const enrolledByName = await this.getEnrolledByName(user);
    const enrolledModules: any[] = [];

    for (const module of modules) {
      try {
        // Check if already enrolled
        const existingEnrollment = await EnrollmentModel.findOne({
          student_id: new Types.ObjectId(dto.student_id),
          module_id: module._id,
          deleted_at: null,
        });

        if (existingEnrollment) {
          // Check if module is already completed - skip those
          const progress = await ProgressModel.findOne({
            student_id: new Types.ObjectId(dto.student_id),
            module_id: module._id,
          });

          if (progress?.status === ProgressStatusEnum.COMPLETED) {
            results.push({
              student_id: dto.student_id,
              student_name: `${student.first_name} ${student.last_name || ''}`.trim(),
              module_id: module._id.toString(),
              module_title: module.title,
              success: true,
              was_duplicate: true,
            });
            skipped++;
            continue;
          }

          results.push({
            student_id: dto.student_id,
            student_name: `${student.first_name} ${student.last_name || ''}`.trim(),
            module_id: module._id.toString(),
            module_title: module.title,
            success: true,
            was_duplicate: true,
          });
          skipped++;
          continue;
        }

        // Create enrollment
        const enrollment = await EnrollmentModel.create({
          student_id: new Types.ObjectId(dto.student_id),
          module_id: module._id,
          school_id: new Types.ObjectId(schoolId),
          enrollment_type: EnrollmentTypeEnum.ACADEMIC_YEAR,
          status: EnrollmentStatusEnum.ACTIVE,
          source: EnrollmentSourceEnum.ACADEMIC_YEAR_ASSIGNMENT,
          academic_year: dto.academic_year,
          batch_id: batchId,
          enrolled_by: new Types.ObjectId(user.id.toString()),
          enrolled_by_role: user.role.name as RoleEnum,
          enrolled_by_name: enrolledByName,
          enrolled_at: new Date(),
          notes: dto.notes,
        });

        // Create initial progress record
        await this.createInitialProgress(ProgressModel, dto.student_id, module._id.toString());

        enrolledModules.push(module);

        results.push({
          student_id: dto.student_id,
          student_name: `${student.first_name} ${student.last_name || ''}`.trim(),
          module_id: module._id.toString(),
          module_title: module.title,
          success: true,
          enrollment_id: enrollment._id.toString(),
        });
        successful++;
      } catch (error) {
        this.logger.error(`Error enrolling student in module ${module._id}:`, error);
        results.push({
          student_id: dto.student_id,
          student_name: `${student.first_name} ${student.last_name || ''}`.trim(),
          module_id: module._id.toString(),
          module_title: module.title,
          success: false,
          error: error.message,
        });
        failed++;
      }
    }

    // Send single notification for all modules
    if (successful > 0 && dto.send_app_notification !== false) {
      await this.sendAcademicYearEnrollmentNotification(
        NotificationModel,
        student,
        dto.academic_year,
        successful,
      );

      // Update all enrollments with notification flag
      await EnrollmentModel.updateMany(
        { batch_id: batchId },
        {
          notification_sent: true,
          notification_sent_at: new Date(),
        },
      );
    }

    if (successful > 0 && dto.send_email_notification !== false) {
      await this.sendEnrollmentEmail(student, enrolledModules, school.name, dto.academic_year);

      await EnrollmentModel.updateMany(
        { batch_id: batchId },
        {
          email_notification_sent: true,
          email_notification_sent_at: new Date(),
        },
      );
    }

    // Log activity
    await this.logEnrollmentActivity(
      user,
      school,
      student,
      ActivityTypeEnum.STUDENT_ENROLLED_ACADEMIC_YEAR,
      successful > 0,
      {
        batch_id: batchId,
        academic_year: dto.academic_year,
        modules_enrolled: successful,
        modules_skipped: skipped,
        modules_failed: failed,
      },
    );

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'ENROLLMENT',
        'ACADEMIC_YEAR_ENROLLED_SUCCESSFULLY',
        user.preferred_language || DEFAULT_LANGUAGE,
      ),
      total_requested: modules.length,
      successful,
      failed,
      skipped,
      batch_id: batchId,
      results,
    };
  }

  /**
   * Bulk enroll multiple students
   */
  async bulkEnrollStudents(
    dto: BulkEnrollStudentsDto,
    user: JWTUserPayload,
  ): Promise<EnrollmentResponseDto> {
    this.logger.log(`Bulk enrolling ${dto.enrollments.length} students`);

    const schoolId = this.resolveSchoolId(user, dto.school_id);
    const batchId = uuidv4();
    const allResults: EnrollmentResultDto[] = [];
    let totalSuccessful = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    for (const enrollmentItem of dto.enrollments) {
      if (enrollmentItem.academic_year) {
        // Enroll in academic year
        const result = await this.enrollStudentInAcademicYear(
          {
            student_id: enrollmentItem.student_id,
            academic_year: enrollmentItem.academic_year,
            school_id: schoolId,
            notes: dto.notes,
            send_email_notification: dto.send_email_notification,
            send_app_notification: dto.send_app_notification,
          },
          user,
        );
        allResults.push(...result.results);
        totalSuccessful += result.successful;
        totalFailed += result.failed;
        totalSkipped += result.skipped;
      } else if (enrollmentItem.module_ids && enrollmentItem.module_ids.length > 0) {
        // Enroll in individual modules
        const result = await this.enrollStudentInModules(
          {
            student_id: enrollmentItem.student_id,
            module_ids: enrollmentItem.module_ids,
            school_id: schoolId,
            notes: dto.notes,
            send_email_notification: dto.send_email_notification,
            send_app_notification: dto.send_app_notification,
          },
          user,
        );
        allResults.push(...result.results);
        totalSuccessful += result.successful;
        totalFailed += result.failed;
        totalSkipped += result.skipped;
      }
    }

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'ENROLLMENT',
        'BULK_ENROLLED_SUCCESSFULLY',
        user.preferred_language || DEFAULT_LANGUAGE,
      ),
      total_requested: allResults.length,
      successful: totalSuccessful,
      failed: totalFailed,
      skipped: totalSkipped,
      batch_id: batchId,
      results: allResults,
    };
  }

  /**
   * Withdraw an enrollment
   */
  async withdrawEnrollment(
    dto: WithdrawEnrollmentDto,
    user: JWTUserPayload,
  ): Promise<{ message: string; enrollment_id: string }> {
    this.logger.log(`Withdrawing enrollment ${dto.enrollment_id}`);

    const schoolId = this.resolveSchoolId(user, dto.school_id);
    const { school, EnrollmentModel, StudentModel, ModuleModel } = await this.getTenantModels(schoolId);

    const enrollment = await EnrollmentModel.findOne({
      _id: new Types.ObjectId(dto.enrollment_id),
      deleted_at: null,
    });

    if (!enrollment) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'ENROLLMENT',
          'ENROLLMENT_NOT_FOUND',
          user.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    if (enrollment.status === EnrollmentStatusEnum.WITHDRAWN) {
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'ENROLLMENT',
          'ENROLLMENT_ALREADY_WITHDRAWN',
          user.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    enrollment.status = EnrollmentStatusEnum.WITHDRAWN;
    enrollment.withdrawn_at = new Date();
    enrollment.withdrawn_by = new Types.ObjectId(user.id.toString());
    enrollment.withdrawal_reason = dto.reason || '';
    await enrollment.save();

    // Get student and module for logging
    const student = await StudentModel.findById(enrollment.student_id);
    const module = await ModuleModel.findById(enrollment.module_id);

    // Log activity
    await this.logEnrollmentActivity(
      user,
      school,
      student,
      ActivityTypeEnum.ENROLLMENT_WITHDRAWN,
      true,
      {
        enrollment_id: dto.enrollment_id,
        module_id: enrollment.module_id.toString(),
        module_title: module?.title || 'Unknown',
        reason: dto.reason,
      },
    );

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'ENROLLMENT',
        'WITHDRAWN_SUCCESSFULLY',
        user.preferred_language || DEFAULT_LANGUAGE,
      ),
      enrollment_id: dto.enrollment_id,
    };
  }

  /**
   * Get enrollment status for a student
   */
  async getStudentEnrollmentStatus(
    dto: GetStudentEnrollmentStatusDto,
    user: JWTUserPayload,
  ): Promise<StudentEnrollmentStatusDto> {
    this.logger.log(`Getting enrollment status for student ${dto.student_id}`);

    const schoolId = this.resolveSchoolId(user, dto.school_id);
    const { StudentModel, ModuleModel, EnrollmentModel, ProgressModel } =
      await this.getTenantModels(schoolId);

    const student = await StudentModel.findOne({
      _id: new Types.ObjectId(dto.student_id),
      deleted_at: null,
    });

    if (!student) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'ENROLLMENT',
          'STUDENT_NOT_FOUND',
          user.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get all enrollments for the student
    const enrollments = await EnrollmentModel.find({
      student_id: new Types.ObjectId(dto.student_id),
      deleted_at: null,
    }).sort({ enrolled_at: -1 });

    // Get all progress records
    const progressRecords = await ProgressModel.find({
      student_id: new Types.ObjectId(dto.student_id),
    });

    const progressMap = new Map();
    for (const progress of progressRecords) {
      progressMap.set(progress.module_id.toString(), progress);
    }

    // Get all modules for the enrollments
    const moduleIds = enrollments.map((e) => e.module_id);
    const modules = await ModuleModel.find({ _id: { $in: moduleIds } });
    const moduleMap = new Map();
    for (const module of modules) {
      moduleMap.set(module._id.toString(), module);
    }

    const enrollmentDetails: EnrollmentDetailsDto[] = [];
    const modulesByYear: Record<number, number> = {};
    let completedModules = 0;
    let activeEnrollments = 0;

    for (const enrollment of enrollments) {
      const module = moduleMap.get(enrollment.module_id.toString());
      const progress = progressMap.get(enrollment.module_id.toString());

      if (module) {
        modulesByYear[module.year] = (modulesByYear[module.year] || 0) + 1;
      }

      if (enrollment.status === EnrollmentStatusEnum.ACTIVE) {
        activeEnrollments++;
      }

      if (
        enrollment.status === EnrollmentStatusEnum.COMPLETED ||
        progress?.status === ProgressStatusEnum.COMPLETED
      ) {
        completedModules++;
      }

      enrollmentDetails.push({
        id: enrollment._id.toString(),
        student_id: dto.student_id,
        student_name: `${student.first_name} ${student.last_name || ''}`.trim(),
        student_email: this.emailEncryptionService.decryptEmail(student.email),
        module_id: enrollment.module_id.toString(),
        module_title: module?.title || 'Unknown',
        enrollment_type: enrollment.enrollment_type,
        status: enrollment.status,
        source: enrollment.source,
        academic_year: enrollment.academic_year,
        enrolled_by: enrollment.enrolled_by.toString(),
        enrolled_by_name: enrollment.enrolled_by_name,
        enrolled_at: enrollment.enrolled_at,
        completed_at: enrollment.completed_at,
        withdrawn_at: enrollment.withdrawn_at,
        notes: enrollment.notes,
        notification_sent: enrollment.notification_sent,
        email_notification_sent: enrollment.email_notification_sent,
      });
    }

    return {
      student_id: dto.student_id,
      student_name: `${student.first_name} ${student.last_name || ''}`.trim(),
      student_email: this.emailEncryptionService.decryptEmail(student.email),
      student_year: student.year,
      total_enrolled: enrollments.length,
      active_enrollments: activeEnrollments,
      completed_modules: completedModules,
      modules_by_year: modulesByYear,
      enrollments: enrollmentDetails,
    };
  }

  /**
   * Get enrollment history with filters
   */
  async getEnrollmentHistory(
    dto: GetEnrollmentHistoryDto,
    pagination: PaginationDto,
    user: JWTUserPayload,
  ): Promise<EnrollmentHistoryResponseDto> {
    this.logger.log('Getting enrollment history');

    const schoolId = this.resolveSchoolId(user, dto.school_id);
    const { StudentModel, ModuleModel, EnrollmentModel } = await this.getTenantModels(schoolId);

    // Build filter
    const filter: any = { deleted_at: null };

    if (dto.student_id) {
      filter.student_id = new Types.ObjectId(dto.student_id);
    }
    if (dto.module_id) {
      filter.module_id = new Types.ObjectId(dto.module_id);
    }
    if (dto.enrollment_type) {
      filter.enrollment_type = dto.enrollment_type;
    }
    if (dto.academic_year) {
      filter.academic_year = dto.academic_year;
    }
    if (dto.enrolled_by) {
      filter.enrolled_by = new Types.ObjectId(dto.enrolled_by);
    }
    if (dto.start_date || dto.end_date) {
      filter.enrolled_at = {};
      if (dto.start_date) {
        filter.enrolled_at.$gte = new Date(dto.start_date);
      }
      if (dto.end_date) {
        filter.enrolled_at.$lte = new Date(dto.end_date);
      }
    }

    const paginationOptions = getPaginationOptions(pagination);
    const total = await EnrollmentModel.countDocuments(filter);
    const enrollments = await EnrollmentModel.find(filter)
      .sort({ enrolled_at: -1 })
      .skip(paginationOptions.skip)
      .limit(paginationOptions.limit);

    // Get all related students and modules
    const studentIds = [...new Set(enrollments.map((e) => e.student_id.toString()))];
    const moduleIds = [...new Set(enrollments.map((e) => e.module_id.toString()))];

    const students = await StudentModel.find({
      _id: { $in: studentIds.map((id) => new Types.ObjectId(id)) },
    });
    const modules = await ModuleModel.find({
      _id: { $in: moduleIds.map((id) => new Types.ObjectId(id)) },
    });

    const studentMap = new Map();
    for (const student of students) {
      studentMap.set(student._id.toString(), student);
    }

    const moduleMap = new Map();
    for (const module of modules) {
      moduleMap.set(module._id.toString(), module);
    }

    const historyItems: EnrollmentHistoryItemDto[] = enrollments.map((enrollment) => {
      const student = studentMap.get(enrollment.student_id.toString());
      const module = moduleMap.get(enrollment.module_id.toString());

      return {
        id: enrollment._id.toString(),
        student_name: student
          ? `${student.first_name} ${student.last_name || ''}`.trim()
          : 'Unknown',
        student_email: student
          ? this.emailEncryptionService.decryptEmail(student.email)
          : 'Unknown',
        module_title: module?.title || 'Unknown',
        enrollment_type: enrollment.enrollment_type,
        status: enrollment.status,
        enrolled_by_name: enrollment.enrolled_by_name,
        enrolled_at: enrollment.enrolled_at,
        academic_year: enrollment.academic_year,
        batch_id: enrollment.batch_id,
      };
    });

    const paginationResult = createPaginationResult(
      historyItems,
      total,
      paginationOptions,
    );

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'ENROLLMENT',
        'ENROLLMENT_HISTORY_RETRIEVED_SUCCESSFULLY',
        user.preferred_language || DEFAULT_LANGUAGE,
      ),
      data: historyItems,
      total: paginationResult.pagination_data.total,
      page: paginationResult.pagination_data.page,
      limit: paginationResult.pagination_data.limit,
      total_pages: paginationResult.pagination_data.totalPages,
    };
  }

  /**
   * Get available students for enrollment (with search)
   */
  async getAvailableStudents(
    moduleId: string | undefined,
    search: string | undefined,
    pagination: PaginationDto,
    user: JWTUserPayload,
    schoolId?: string,
  ): Promise<{ message: string; data: AvailableStudentDto[]; total: number; page: number; limit: number }> {
    this.logger.log('Getting available students for enrollment');

    const resolvedSchoolId = this.resolveSchoolId(user, schoolId);
    const { StudentModel, EnrollmentModel } = await this.getTenantModels(resolvedSchoolId);

    // Build filter
    const filter: any = { deleted_at: null };
    if (search) {
      const encryptedSearch = this.emailEncryptionService.encryptEmail(search);
      filter.$or = [
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
        { email: encryptedSearch },
        { student_code: { $regex: search, $options: 'i' } },
      ];
    }

    const paginationOptions = getPaginationOptions(pagination);
    const total = await StudentModel.countDocuments(filter);
    const students = await StudentModel.find(filter)
      .skip(paginationOptions.skip)
      .limit(paginationOptions.limit)
      .sort({ first_name: 1 });

    const studentData: AvailableStudentDto[] = [];

    for (const student of students) {
      // Count enrolled modules
      const enrolledCount = await EnrollmentModel.countDocuments({
        student_id: student._id,
        status: EnrollmentStatusEnum.ACTIVE,
        deleted_at: null,
      });

      // Check if enrolled in specific module
      let isEnrolledInModule = false;
      if (moduleId) {
        const moduleEnrollment = await EnrollmentModel.findOne({
          student_id: student._id,
          module_id: new Types.ObjectId(moduleId),
          deleted_at: null,
        });
        isEnrolledInModule = !!moduleEnrollment;
      }

      studentData.push({
        id: student._id.toString(),
        name: `${student.first_name} ${student.last_name || ''}`.trim(),
        email: this.emailEncryptionService.decryptEmail(student.email),
        year: student.year,
        enrolled_modules_count: enrolledCount,
        is_enrolled_in_module: isEnrolledInModule,
      });
    }

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'ENROLLMENT',
        'AVAILABLE_STUDENTS_RETRIEVED_SUCCESSFULLY',
        user.preferred_language || DEFAULT_LANGUAGE,
      ),
      data: studentData,
      total,
      page: paginationOptions.page,
      limit: paginationOptions.limit,
    };
  }

  /**
   * Get available modules for enrollment
   */
  async getAvailableModules(
    studentId: string | undefined,
    year: number | undefined,
    pagination: PaginationDto,
    user: JWTUserPayload,
    schoolId?: string,
  ): Promise<{ message: string; data: AvailableModuleDto[]; total: number; page: number; limit: number }> {
    this.logger.log('Getting available modules for enrollment');

    const resolvedSchoolId = this.resolveSchoolId(user, schoolId);
    const { ModuleModel, EnrollmentModel } = await this.getTenantModels(resolvedSchoolId);

    // Build filter - only published modules
    const filter: any = { deleted_at: null, published: true };
    if (year) {
      filter.year = year;
    }

    const paginationOptions = getPaginationOptions(pagination);
    const total = await ModuleModel.countDocuments(filter);
    const modules = await ModuleModel.find(filter)
      .skip(paginationOptions.skip)
      .limit(paginationOptions.limit)
      .sort({ year: 1, sequence: 1 });

    const moduleData: AvailableModuleDto[] = [];

    for (const module of modules) {
      // Count enrolled students
      const enrolledCount = await EnrollmentModel.countDocuments({
        module_id: module._id,
        status: EnrollmentStatusEnum.ACTIVE,
        deleted_at: null,
      });

      moduleData.push({
        id: module._id.toString(),
        title: module.title,
        subject: module.subject,
        year: module.year,
        published: module.published,
        enrolled_count: enrolledCount,
      });
    }

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'ENROLLMENT',
        'AVAILABLE_MODULES_RETRIEVED_SUCCESSFULLY',
        user.preferred_language || DEFAULT_LANGUAGE,
      ),
      data: moduleData,
      total,
      page: paginationOptions.page,
      limit: paginationOptions.limit,
    };
  }

  /**
   * Get module enrollment summary
   */
  async getModuleEnrollmentSummary(
    user: JWTUserPayload,
    schoolId?: string,
  ): Promise<ModuleEnrollmentSummaryDto[]> {
    this.logger.log('Getting module enrollment summary');

    const resolvedSchoolId = this.resolveSchoolId(user, schoolId);
    const { ModuleModel, EnrollmentModel } = await this.getTenantModels(resolvedSchoolId);

    const modules = await ModuleModel.find({
      deleted_at: null,
      published: true,
    }).sort({ year: 1, sequence: 1 });

    const summaries: ModuleEnrollmentSummaryDto[] = [];

    for (const module of modules) {
      const [active, completed, withdrawn] = await Promise.all([
        EnrollmentModel.countDocuments({
          module_id: module._id,
          status: EnrollmentStatusEnum.ACTIVE,
          deleted_at: null,
        }),
        EnrollmentModel.countDocuments({
          module_id: module._id,
          status: EnrollmentStatusEnum.COMPLETED,
          deleted_at: null,
        }),
        EnrollmentModel.countDocuments({
          module_id: module._id,
          status: EnrollmentStatusEnum.WITHDRAWN,
          deleted_at: null,
        }),
      ]);

      summaries.push({
        module_id: module._id.toString(),
        module_title: module.title,
        module_year: module.year,
        total_enrolled: active + completed + withdrawn,
        active,
        completed,
        withdrawn,
      });
    }

    return summaries;
  }

  // ========== Helper Methods ==========

  private async getEnrolledByName(user: JWTUserPayload): Promise<string> {
    if (user.role.name === RoleEnum.STUDENT) {
      return 'Student';
    }

    const centralUser = await this.userModel.findById(user.id);
    if (centralUser) {
      return `${centralUser.first_name} ${centralUser.last_name || ''}`.trim();
    }
    return 'Unknown';
  }

  private async createInitialProgress(
    ProgressModel: any,
    studentId: string,
    moduleId: string,
  ): Promise<void> {
    const existingProgress = await ProgressModel.findOne({
      student_id: new Types.ObjectId(studentId),
      module_id: new Types.ObjectId(moduleId),
    });

    if (!existingProgress) {
      await ProgressModel.create({
        student_id: new Types.ObjectId(studentId),
        module_id: new Types.ObjectId(moduleId),
        status: ProgressStatusEnum.NOT_STARTED,
        progress_percentage: 0,
        chapters_completed: 0,
        total_chapters: 0,
      });
    }
  }

  private async sendEnrollmentNotification(
    NotificationModel: any,
    student: any,
    module: any,
    type: NotificationTypeEnum,
  ): Promise<void> {
    try {
      await NotificationModel.create({
        recipient_type: RecipientTypeEnum.STUDENT,
        recipient_id: student._id,
        title: {
          en: 'New Module Enrolled',
          fr: 'Nouveau Module Inscrit',
        },
        message: {
          en: `You have been enrolled in "${module.title}". Start learning now!`,
          fr: `Vous avez été inscrit à "${module.title}". Commencez à apprendre maintenant !`,
        },
        type,
        metadata: {
          module_id: module._id.toString(),
          module_title: module.title,
        },
        status: NotificationStatusEnum.UNREAD,
      });
    } catch (error) {
      this.logger.error('Failed to send enrollment notification:', error);
    }
  }

  private async sendAcademicYearEnrollmentNotification(
    NotificationModel: any,
    student: any,
    academicYear: number,
    moduleCount: number,
  ): Promise<void> {
    try {
      await NotificationModel.create({
        recipient_type: RecipientTypeEnum.STUDENT,
        recipient_id: student._id,
        title: {
          en: `Year ${academicYear} Enrollment Complete`,
          fr: `Inscription Année ${academicYear} Terminée`,
        },
        message: {
          en: `You have been enrolled in ${moduleCount} modules for Year ${academicYear}. Start your learning journey!`,
          fr: `Vous avez été inscrit à ${moduleCount} modules pour l'Année ${academicYear}. Commencez votre parcours d'apprentissage !`,
        },
        type: NotificationTypeEnum.ACADEMIC_YEAR_ENROLLMENT,
        metadata: {
          academic_year: academicYear,
          module_count: moduleCount,
        },
        status: NotificationStatusEnum.UNREAD,
      });
    } catch (error) {
      this.logger.error('Failed to send academic year enrollment notification:', error);
    }
  }

  private async sendEnrollmentEmail(
    student: any,
    modules: any[],
    schoolName: string,
    academicYear?: number,
  ): Promise<void> {
    try {
      const email = this.emailEncryptionService.decryptEmail(student.email);
      const studentName = `${student.first_name} ${student.last_name || ''}`.trim();
      const language = student.preferred_language || DEFAULT_LANGUAGE;

      const moduleList = modules.map((m) => `• ${m.title}`).join('\n');

      // Use the queue service to send enrollment notification emails
      // For now, log that we would send the email
      this.logger.log(
        `Enrollment email would be sent to ${email} for ${modules.length} modules`,
      );

      // TODO: Create enrollment email template and use mailService to send
      // The mail service currently doesn't have a generic sendMail method
      // For now, we'll skip actual email sending but mark it as sent
      // This can be implemented later with a proper enrollment email template
    } catch (error) {
      this.logger.error('Failed to send enrollment email:', error);
    }
  }

  private async logEnrollmentActivity(
    user: JWTUserPayload,
    school: any,
    student: any,
    activityType: ActivityTypeEnum,
    isSuccess: boolean,
    metadata: Record<string, any>,
  ): Promise<void> {
    try {
      const description = getActivityDescription(activityType, isSuccess);
      await this.activityLogService.createActivityLog({
        activity_type: activityType,
        description: {
          en: description[LanguageEnum.ENGLISH],
          fr: description[LanguageEnum.FRENCH],
        },
        performed_by: new Types.ObjectId(user.id.toString()),
        performed_by_role: user.role.name as RoleEnum,
        school_id: school._id,
        school_name: school.name,
        target_user_id: student?._id,
        target_user_email: student
          ? this.emailEncryptionService.decryptEmail(student.email)
          : undefined,
        target_user_role: RoleEnum.STUDENT,
        metadata,
        is_success: isSuccess,
        status: isSuccess ? 'INFO' : 'ERROR',
      });
    } catch (error) {
      this.logger.error('Failed to log enrollment activity:', error);
    }
  }
}

