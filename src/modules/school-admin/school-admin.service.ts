import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { ROLE_IDS, RoleEnum } from 'src/common/constants/roles.constant';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { BcryptUtil } from 'src/common/utils/bcrypt.util';
import { School } from 'src/database/schemas/central/school.schema';
import { User } from 'src/database/schemas/central/user.schema';
import { MailService } from 'src/mail/mail.service';
import { CreateSchoolAdminDto } from './dto/create-school-admin.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';
import { GlobalStudent } from 'src/database/schemas/central/global-student.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { Student } from 'src/database/schemas/tenant/student.schema';
import { StudentSchema } from 'src/database/schemas/tenant/student.schema';
import { StudentModuleProgress } from 'src/database/schemas/tenant/student-module-progress.schema';
import { StudentModuleProgressSchema } from 'src/database/schemas/tenant/student-module-progress.schema';
import { Module } from 'src/database/schemas/tenant/module.schema';
import { ModuleSchema } from 'src/database/schemas/tenant/module.schema';
import { AIChatFeedback } from 'src/database/schemas/tenant/ai-chat-feedback.schema';
import { AIChatFeedbackSchema } from 'src/database/schemas/tenant/ai-chat-feedback.schema';
import { ModuleProfessorAssignment } from 'src/database/schemas/tenant/module-professor-assignment.schema';
import { ModuleProfessorAssignmentSchema } from 'src/database/schemas/tenant/module-professor-assignment.schema';
import { ProgressStatusEnum } from 'src/common/constants/status.constant';
import { ErrorMessageService } from 'src/common/services/error-message.service';
import { EmailEncryptionService } from 'src/common/services/email-encryption.service';
import { DEFAULT_LANGUAGE } from 'src/common/constants/language.constant';

@Injectable()
export class SchoolAdminService {
  private readonly logger = new Logger(SchoolAdminService.name);
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    @InjectModel(GlobalStudent.name)
    private readonly globalStudentModel: Model<GlobalStudent>,
    private readonly bcryptUtil: BcryptUtil,
    private readonly mailService: MailService,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly errorMessageService: ErrorMessageService,
    private readonly emailEncryptionService: EmailEncryptionService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async createSchoolAdmin(
    createSchoolAdminDto: CreateSchoolAdminDto,
    user: JWTUserPayload,
  ) {
    const {
      school_email,
      school_name,
      school_website_url,
      user_email,
      user_first_name,
      user_last_name,
      preferred_language,
    } = createSchoolAdminDto;

    this.logger.log(
      `Creating school admin: ${user_email} for school: ${school_name}`,
    );

    const encryptedUserEmail = this.emailEncryptionService.encryptEmail(user_email);
    const encryptedSchoolEmail = this.emailEncryptionService.encryptEmail(school_email);
    
    const [existingUser, existingSchool, existingGlobalStudent] =
      await Promise.all([
        this.userModel.exists({ email: encryptedUserEmail }),
        this.schoolModel.exists({ email: encryptedSchoolEmail }),
        this.globalStudentModel.findOne({
          email: encryptedUserEmail,
        }),
      ]);

    // Check if the user is already a global student;
    if (existingGlobalStudent) {
      this.logger.warn(`Student with this email already exists: ${user_email}`);
      throw new ConflictException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'STUDENT_ALREADY_EXISTS',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
    if (existingUser) {
      this.logger.warn(`User with this email already exists: ${user_email}`);
      throw new ConflictException(
        this.errorMessageService.getMessageWithLanguage(
          'USER',
          'USER_ALREADY_EXISTS',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
    if (existingSchool) {
      this.logger.warn(
        `School with this email already exists: ${school_email}`,
      );
      throw new ConflictException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'SCHOOL_ALREADY_EXISTS',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      // Allow numbers and lowercase letters in db_name, replace all other characters except spaces
      // Numbers in database names are generally safe and supported by MongoDB and most RDBMS.
      const db_name = school_name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '_');

      const dbNameExists = await this.schoolModel.exists({ db_name });
      if (dbNameExists) {
        this.logger.warn(`School with this name already exists: ${db_name}`);
        throw new ConflictException(
          this.errorMessageService.getMessageWithLanguage(
            'SCHOOL',
            'SCHOOL_ALREADY_EXISTS',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      const [createdSchool] = await this.schoolModel.insertMany([
        {
          name: school_name,
          email: encryptedSchoolEmail,
          website_url: school_website_url,
          db_name,
          created_by: new Types.ObjectId(user.id),
        },
      ]);

      const password = this.bcryptUtil.generateStrongPassword();

      await this.userModel.insertMany([
        {
          email: encryptedUserEmail,
          first_name: user_first_name,
          last_name: user_last_name,
          school_id: createdSchool._id,
          password: await this.bcryptUtil.hashPassword(password),
          role: new Types.ObjectId(ROLE_IDS.SCHOOL_ADMIN),
          created_by: new Types.ObjectId(user.id),
          preferred_language: preferred_language || DEFAULT_LANGUAGE, // Use provided language or default
        },
      ]);

      // Send email to the new school admin with preferred language from DTO
      await this.mailService.sendCredentialsEmail(
        user_email,
        `${user_first_name}${user_last_name ? ` ${user_last_name}` : ''}`,
        password,
        RoleEnum.SCHOOL_ADMIN,
        preferred_language || user?.preferred_language,
      );
      this.logger.log(`Credentials email sent to: ${user_email}`);

      await session.commitTransaction();
      this.logger.log(`Transaction committed for school admin: ${user_email}`);
      return {
        message: this.errorMessageService.getMessageWithLanguage(
          'SCHOOL_ADMIN',
          'SCHOOL_ADMIN_CREATED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        success: true,
      };
    } catch (error) {
      this.logger.error('Error creating school admin', error?.stack || error);
      await session.abortTransaction();
      if (error?.code === 11000) {
        throw new ConflictException(
          this.errorMessageService.getMessageWithLanguage(
            'SCHOOL_ADMIN',
            'FAILED_TO_CREATE_SCHOOL_ADMIN',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL_ADMIN',
          'FAILED_TO_CREATE_SCHOOL_ADMIN',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    } finally {
      session.endSession();
    }
  }

  async getDashboard(user: JWTUserPayload) {
    this.logger.log(`Getting dashboard for school admin: ${user.id}`);

    // Get school information
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL_ADMIN',
          'SCHOOL_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);

    // Get counts for dashboard
    const [studentCount, professorCount] = await Promise.all([
      tenantConnection.model('Student').countDocuments({ deleted_at: null }),
      this.userModel.countDocuments({
        role: new Types.ObjectId(ROLE_IDS.PROFESSOR),
        school_id: user.school_id
          ? new Types.ObjectId(user.school_id)
          : undefined,
        deleted_at: null,
      }),
    ]);

    return {
      message: this.errorMessageService.getMessageWithLanguage(
        'SCHOOL_ADMIN',
        'DASHBOARD_INFORMATION_RETRIEVED_SUCCESSFULLY',
        user?.preferred_language || DEFAULT_LANGUAGE,
      ),
      data: {
        school: {
          id: school._id,
          name: school.name,
          email: school.email,
          status: school.status,
        },
        counts: {
          students: studentCount,
          professors: professorCount,
        },
      },
    };
  }

  async getEnhancedDashboard(
    user: JWTUserPayload,
    filterDto: DashboardFilterDto,
  ) {
    this.logger.log(
      `Getting enhanced dashboard for user: ${user.id} with role: ${user.role.name}`,
    );

    // Get school information
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);

    // Initialize models
    const StudentModel = tenantConnection.model(Student.name, StudentSchema);
    const StudentModuleProgressModel = tenantConnection.model(
      StudentModuleProgress.name,
      StudentModuleProgressSchema,
    );
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);
    const AIChatFeedbackModel = tenantConnection.model(
      AIChatFeedback.name,
      AIChatFeedbackSchema,
    );
    const ModuleProfessorAssignmentModel = tenantConnection.model(
      ModuleProfessorAssignment.name,
      ModuleProfessorAssignmentSchema,
    );

    try {
      // Build date filter
      const dateFilter: any = {};
      if (filterDto.from_date) {
        // Handle different date formats and set to start of day
        const fromDate = new Date(filterDto.from_date);
        if (isNaN(fromDate.getTime())) {
          throw new BadRequestException(
            'Invalid from_date format. Use YYYY-MM-DD',
          );
        }
        fromDate.setHours(0, 0, 0, 0);
        dateFilter.$gte = fromDate;
      }
      if (filterDto.to_date) {
        // Handle different date formats and set to end of day
        const toDate = new Date(filterDto.to_date);
        if (isNaN(toDate.getTime())) {
          throw new BadRequestException(
            'Invalid to_date format. Use YYYY-MM-DD',
          );
        }
        toDate.setHours(23, 59, 59, 999);
        dateFilter.$lte = toDate;
      }

      // Validate date range if both dates are provided
      if (filterDto.from_date && filterDto.to_date) {
        const fromDate = new Date(filterDto.from_date);
        const toDate = new Date(filterDto.to_date);
        if (fromDate > toDate) {
          throw new BadRequestException('from_date must be before to_date');
        }
      }

      // Log date filter for debugging
      if (Object.keys(dateFilter).length > 0) {
        this.logger.log(`Date filter applied: ${JSON.stringify(dateFilter)}`);
      }

      // Get professor's assigned modules if user is professor
      let assignedModuleIds: Types.ObjectId[] = [];
      if (user.role.name === RoleEnum.PROFESSOR) {
        const assignments = await ModuleProfessorAssignmentModel.find({
          professor_id: new Types.ObjectId(user.id),
          is_active: true,
          deleted_at: null,
        }).lean();
        assignedModuleIds = assignments.map((a) => a.module_id);

        if (assignedModuleIds.length === 0) {
          return {
            message: 'No modules assigned to this professor',
            data: {
              overview: {
                active_students: 0,
                total_students: 0,
                average_completion_percentage: 0,
                total_modules: 0,
                active_modules: 0,
              },
              module_performance: [],
              ai_feedback_errors: [],
              engagement_metrics: {
                total_views: 0,
                average_session_duration: 0,
                completion_rate: 0,
                drop_off_points: [],
              },
            },
          };
        }
      }

      // Build module filter
      const moduleFilter: any = {};
      if (filterDto.module_id) {
        moduleFilter.module_id = new Types.ObjectId(filterDto.module_id);
      } else if (user.role.name === RoleEnum.PROFESSOR) {
        moduleFilter.module_id = { $in: assignedModuleIds };
      }

      // Apply date filter to module progress query
      const moduleProgressQuery = { ...moduleFilter, deleted_at: null };
      if (Object.keys(dateFilter).length > 0) {
        moduleProgressQuery.updated_at = dateFilter;
      }

      // Get active students (students who have progress > 0 in the last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const activeStudentsQuery = {
        ...moduleFilter,
        progress_percentage: { $gt: 0 },
        updated_at: { $gte: sevenDaysAgo },
        deleted_at: null,
      };

      // Apply date filter to active students query if provided
      if (Object.keys(dateFilter).length > 0) {
        activeStudentsQuery.updated_at = dateFilter;
      }

      const [totalStudents, activeStudents, moduleProgresses, modules] =
        await Promise.all([
          StudentModel.countDocuments({ deleted_at: null }),
          StudentModuleProgressModel.distinct(
            'student_id',
            activeStudentsQuery,
          ),
          StudentModuleProgressModel.find(moduleProgressQuery)
            .populate('student_id', 'first_name last_name email')
            .populate('module_id', 'title subject')
            .lean(),
          ModuleModel.find({ deleted_at: null }).lean(),
        ]);

      // Calculate overview statistics
      const totalModules =
        user.role.name === RoleEnum.PROFESSOR
          ? assignedModuleIds.length
          : modules.length;

      let activeModules = 0;
      let averageCompletionPercentage = 0;

      try {
        if (moduleProgresses.length > 0) {
          // Count unique modules that have students with progress > 0 (active modules)
          const activeModuleIds = new Set();
          moduleProgresses.forEach((progress) => {
            const moduleId =
              progress.module_id?._id?.toString() ||
              progress.module_id?.toString();
            if (
              moduleId &&
              moduleId !== 'null' &&
              moduleId !== 'undefined' &&
              (progress.progress_percentage || 0) > 0
            ) {
              activeModuleIds.add(moduleId);
            }
          });
          activeModules = activeModuleIds.size;

          const totalProgress = moduleProgresses.reduce(
            (sum, progress) => sum + (progress.progress_percentage || 0),
            0,
          );
          averageCompletionPercentage = Math.round(
            totalProgress / moduleProgresses.length,
          );
        }
      } catch (error) {
        this.logger.warn(
          'Error calculating overview statistics:',
          error?.message,
        );
        // Use default values if calculation fails
        activeModules = 0;
        averageCompletionPercentage = 0;
      }

      // Get AI feedback errors
      const aiFeedbackQuery: any = { deleted_at: null };
      if (user.role.name === RoleEnum.PROFESSOR) {
        aiFeedbackQuery.module_id = { $in: assignedModuleIds };
      }
      if (Object.keys(dateFilter).length > 0) {
        aiFeedbackQuery.created_at = dateFilter;
      }

      const aiFeedbacks = await AIChatFeedbackModel.find(aiFeedbackQuery)
        .populate('module_id', 'title')
        .populate('student_id', 'first_name last_name')
        .lean();

      // Analyze AI feedback errors
      let errorAnalysis: any[] = [];
      try {
        errorAnalysis = this.analyzeAIFeedbackErrors(aiFeedbacks);
      } catch (error) {
        this.logger.warn('Error analyzing AI feedback errors:', error?.message);
      }

      // Calculate module performance
      let modulePerformance: any[] = [];
      try {
        modulePerformance = this.calculateModulePerformance(
          moduleProgresses,
          modules,
        );
      } catch (error) {
        this.logger.warn(
          'Error calculating module performance:',
          error?.message,
        );
      }

      // Calculate engagement metrics
      let engagementMetrics = {
        total_views: 0,
        average_session_duration: 0,
        completion_rate: 0,
      };
      try {
        engagementMetrics = this.calculateEngagementMetrics(
          moduleProgresses,
          modules,
        );
      } catch (error) {
        this.logger.warn(
          'Error calculating engagement metrics:',
          error?.message,
        );
      }

      // Add debug logging
      this.logger.log(
        `Dashboard stats - Active students: ${activeStudents.length}, Total students: ${totalStudents}, Total modules: ${totalModules}, Active modules: ${activeModules}`,
      );

      return {
        message: 'Dashboard statistics retrieved successfully',
        data: {
          overview: {
            active_students: activeStudents.length,
            total_students: totalStudents,
            average_completion_percentage: averageCompletionPercentage,
            total_modules: totalModules,
            active_modules: activeModules,
          },
          module_performance: modulePerformance,
          ai_feedback_errors: errorAnalysis,
          engagement_metrics: engagementMetrics,
        },
      };
    } catch (error) {
      this.logger.error(
        'Error getting enhanced dashboard',
        error?.stack || error,
      );
      throw new BadRequestException('Failed to retrieve dashboard statistics');
    }
  }

  private analyzeAIFeedbackErrors(feedbacks: any[]): any[] {
    const errorTypes = {};

    feedbacks.forEach((feedback) => {
      // Analyze skill_gaps instead of feedback_type
      const skillGaps = feedback.skill_gaps || [];

      if (skillGaps.length === 0) {
        // If no skill gaps, use a default category
        const errorType = 'no_skill_gaps_identified';
        if (!errorTypes[errorType]) {
          errorTypes[errorType] = {
            count: 0,
            affected_students: new Set(),
            modules: new Set(),
          };
        }
        errorTypes[errorType].count++;
      } else {
        // Process each skill gap as a separate error type
        skillGaps.forEach((skillGap) => {
          if (skillGap && skillGap.trim() !== '') {
            if (!errorTypes[skillGap]) {
              errorTypes[skillGap] = {
                count: 0,
                affected_students: new Set(),
                modules: new Set(),
              };
            }

            errorTypes[skillGap].count++;
          }
        });
      }

      const studentId =
        feedback.student_id?._id?.toString() || feedback.student_id?.toString();
      const moduleId =
        feedback.module_id?._id?.toString() || feedback.module_id?.toString();

      // Add student and module to all relevant error types
      Object.keys(errorTypes).forEach((errorType) => {
        if (studentId && studentId !== 'null' && studentId !== 'undefined') {
          errorTypes[errorType].affected_students.add(studentId);
        }
        if (moduleId && moduleId !== 'null' && moduleId !== 'undefined') {
          errorTypes[errorType].modules.add(moduleId);
        }
      });
    });

    const totalFeedbacks = feedbacks.length;

    return Object.entries(errorTypes)
      .map(([errorType, data]: [string, any]) => ({
        error_type: errorType,
        count: data.count,
        percentage:
          totalFeedbacks > 0
            ? Math.round((data.count / totalFeedbacks) * 100 * 10) / 10
            : 0,
        affected_students: data.affected_students.size,
        affected_modules: data.modules.size,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 error types
  }

  private calculateModulePerformance(progresses: any[], modules: any[]): any[] {
    const moduleStats = {};

    progresses.forEach((progress) => {
      const moduleId =
        progress.module_id?._id?.toString() || progress.module_id?.toString();
      if (!moduleId) return; // Skip if no module ID

      if (!moduleStats[moduleId]) {
        moduleStats[moduleId] = {
          module_id: moduleId,
          title: progress.module_id?.title || 'Unknown Module',
          total_students: 0,
          completed_students: 0,
          total_progress: 0,
          total_time_spent: 0,
        };
      }

      moduleStats[moduleId].total_students++;
      moduleStats[moduleId].total_progress += progress.progress_percentage;

      if (progress.status === ProgressStatusEnum.COMPLETED) {
        moduleStats[moduleId].completed_students++;
      }

      // Estimate time spent based on progress percentage (simplified)
      moduleStats[moduleId].total_time_spent +=
        progress.progress_percentage * 2; // 2 minutes per percentage point
    });

    return Object.values(moduleStats).map((stats: any) => ({
      module_id: stats.module_id,
      title: stats.title,
      completion_percentage:
        stats.total_students > 0
          ? Math.round((stats.completed_students / stats.total_students) * 100)
          : 0,
      active_students: stats.total_students,
      average_time_spent:
        stats.total_students > 0
          ? Math.round(stats.total_time_spent / stats.total_students)
          : 0,
    }));
  }

  private calculateEngagementMetrics(progresses: any[], modules: any[]): any {
    const totalViews = progresses.length;
    const completedProgresses = progresses.filter(
      (p) => p.status === ProgressStatusEnum.COMPLETED,
    );
    const completionRate =
      totalViews > 0
        ? Math.round((completedProgresses.length / totalViews) * 100)
        : 0;

    // Calculate average session duration (simplified)
    const totalTimeSpent = progresses.reduce(
      (sum, progress) => sum + progress.progress_percentage * 2,
      0,
    );
    const averageSessionDuration =
      totalViews > 0 ? Math.round(totalTimeSpent / totalViews) : 0;

    return {
      total_views: totalViews,
      average_session_duration: averageSessionDuration,
      completion_rate: completionRate,
    };
  }

  async resetPassword(userId: string, resetPasswordDto: ResetPasswordDto) {
    const { old_password, new_password } = resetPasswordDto;
    this.logger.log(`Resetting password for user: ${userId}`);

    // Find the school admin by ID
    const user = await this.userModel
      .findById(new Types.ObjectId(userId))
      .select('+password');
    if (!user) {
      this.logger.warn(`School admin not found: ${userId}`);
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL_ADMIN',
          'USER_NOT_FOUND',
          DEFAULT_LANGUAGE,
        ),
      );
    }

    // Check if user is school admin or professor
    const userRoleId = user.role.toString();
    if (
      userRoleId !== ROLE_IDS.SCHOOL_ADMIN &&
      userRoleId !== ROLE_IDS.PROFESSOR
    ) {
      this.logger.warn(`Invalid user role for password reset: ${user.role}`);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL_ADMIN',
          'INVALID_USER_TYPE_FOR_PASSWORD_RESET',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Validate old password
    const isPasswordValid = await this.bcryptUtil.comparePassword(
      old_password,
      user.password,
    );

    if (!isPasswordValid) {
      this.logger.warn(`Invalid old password for user: ${userId}`);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL_ADMIN',
          'INVALID_OLD_PASSWORD',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Hash the new password
    const hashedNewPassword = await this.bcryptUtil.hashPassword(new_password);

    // Update the password
    user.password = hashedNewPassword;
    user.last_logged_in = new Date();

    const updatedUser = await user.save();
    this.logger.log(`Password updated successfully for user: ${user.email}`);

    return {
      message: this.errorMessageService.getMessageWithLanguage(
        'SCHOOL_ADMIN',
        'PASSWORD_UPDATED_SUCCESSFULLY',
        user?.preferred_language || DEFAULT_LANGUAGE,
      ),
      data: {
        id: updatedUser._id,
        email: updatedUser.email,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        school_id: updatedUser.school_id,
        created_at: updatedUser.created_at,
      },
    };
  }
}
