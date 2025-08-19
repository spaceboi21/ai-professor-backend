import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
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
  ModuleProfessorAssignment,
  ModuleProfessorAssignmentSchema,
} from 'src/database/schemas/tenant/module-professor-assignment.schema';
import {
  AssignmentAuditLog,
  AssignmentAuditLogSchema,
  AssignmentActionEnum,
} from 'src/database/schemas/tenant/assignment-audit-log.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { ROLE_IDS, RoleEnum } from 'src/common/constants/roles.constant';
import {
  AssignProfessorDto,
  UnassignProfessorDto,
  ManageModuleAssignmentsDto,
} from './dto/assign-professor.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  getPaginationOptions,
  createPaginationResult,
} from 'src/common/utils/pagination.util';
import {
  NotificationTypeEnum,
  NotificationStatusEnum,
} from 'src/common/constants/notification.constant';
import { RecipientTypeEnum } from 'src/database/schemas/tenant/notification.schema';
import { ErrorMessageService } from 'src/common/services/error-message.service';
import { DEFAULT_LANGUAGE } from 'src/common/constants/language.constant';

export interface AssignmentResult {
  professor_id: string | Types.ObjectId;
  status: string; // 'assigned', 'unassigned', 'unchanged', 'reactivated', 'error'
  message: string;
}

export interface ManageModuleAssignmentsResponse {
  message: string;
  data: {
    module_id: string | Types.ObjectId;
    module_title: string;
    summary: {
      total_assigned: number;
      total_unassigned: number;
      total_unchanged: number;
      total_processed: number;
    };
    results: {
      assigned: AssignmentResult[];
      unassigned: AssignmentResult[];
      unchanged: AssignmentResult[];
    };
    audit_logs_created: number;
  };
}

interface NotificationData {
  professor_id: string | Types.ObjectId;
  type: string;
  module_title: string;
  module_data?: any;
  assigned_by?: JWTUserPayload;
}

@Injectable()
export class ModuleAssignmentService {
  private readonly logger = new Logger(ModuleAssignmentService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly notificationsService: NotificationsService,
    private readonly errorMessageService: ErrorMessageService,
  ) {}

  /**
   * Helper method to resolve school_id based on user role
   * For SUPER_ADMIN: school_id must be provided in the request body/query
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
            'SCHOOL',
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

  async assignProfessorsToModule(
    assignDto: AssignProfessorDto,
    user: JWTUserPayload,
  ) {
    this.logger.log(`Assigning professors to module: ${assignDto.module_id}`);

    // Resolve school_id based on user role
    const resolvedSchoolId = this.resolveSchoolId(user, assignDto.school_id);

    // Validate school exists
    const school = await this.schoolModel.findById(
      new Types.ObjectId(resolvedSchoolId),
    );
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'SCHOOL_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);
    const AssignmentModel = tenantConnection.model(
      ModuleProfessorAssignment.name,
      ModuleProfessorAssignmentSchema,
    );
    const AuditLogModel = tenantConnection.model(
      AssignmentAuditLog.name,
      AssignmentAuditLogSchema,
    );
    // Validate module exists
    const module = await ModuleModel.findById(assignDto.module_id);
    if (!module) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'MODULE',
          'MODULE_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
    // Validate all professors exist and are from the same school
    const professorIds = assignDto.professor_ids.map(
      (id) => new Types.ObjectId(id),
    );

    const professors = await this.userModel.find({
      _id: { $in: professorIds },
      school_id: new Types.ObjectId(resolvedSchoolId),
      role: new Types.ObjectId(ROLE_IDS.PROFESSOR), // PROFESSOR role ID
      deleted_at: null,
    });
    if (professors.length !== assignDto.professor_ids.length) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'PROFESSOR',
          'PROFESSOR_NOT_FOUND_OR_NOT_IN_YOUR_SCHOOL',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const results: AssignmentResult[] = [];
    const notifications: NotificationData[] = [];
    const auditLogs: any[] = [];

    for (const professorId of assignDto.professor_ids) {
      try {
        // Check if assignment already exists
        const existingAssignment = await AssignmentModel.findOne({
          module_id: new Types.ObjectId(assignDto.module_id),
          professor_id: new Types.ObjectId(professorId),
          is_active: true,
        });

        if (existingAssignment) {
          // Update existing assignment
          const previousData = {
            assigned_at: existingAssignment.assigned_at,
            assigned_by: existingAssignment.assigned_by,
          };

          existingAssignment.assigned_by = new Types.ObjectId(user.id);
          existingAssignment.assigned_by_role = user.role.name as RoleEnum;
          existingAssignment.assigned_at = new Date();
          existingAssignment.unassigned_at = null;
          existingAssignment.unassigned_by = null;
          existingAssignment.unassigned_by_role = null;
          existingAssignment.is_active = true;

          await existingAssignment.save();

          // Create audit log
          const auditLog = new AuditLogModel({
            module_id: new Types.ObjectId(assignDto.module_id),
            professor_id: new Types.ObjectId(professorId),
            action: AssignmentActionEnum.ASSIGN,
            performed_by: new Types.ObjectId(user.id),
            performed_by_role: user.role.name as RoleEnum,
            action_description: `Updated professor assignment`,
            previous_data: previousData,
            new_data: {
              assigned_at: existingAssignment.assigned_at,
              assigned_by: existingAssignment.assigned_by,
            },
          });
          await auditLog.save();
          auditLogs.push(auditLog);

          results.push({
            professor_id: professorId,
            status: 'updated',
            message: this.errorMessageService.getSuccessMessageWithLanguage(
              'MODULE',
              'ASSIGNMENT_UPDATED_SUCCESSFULLY',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          });

          // Add notification for professor
          notifications.push({
            professor_id: professorId,
            type: 'assignment_updated',
            module_title: module.title,
            module_data: module, // Pass full module data
            assigned_by: user, // Pass user who performed the action
          });
        } else {
          // Create new assignment
          const newAssignment = new AssignmentModel({
            module_id: new Types.ObjectId(assignDto.module_id),
            professor_id: new Types.ObjectId(professorId),
            assigned_by: new Types.ObjectId(user.id),
            assigned_by_role: user.role.name as RoleEnum,
            assigned_at: new Date(),
            is_active: true,
            unassigned_at: null,
            unassigned_by: null,
            unassigned_by_role: null,
          });

          await newAssignment.save();

          // Create audit log
          const auditLog = new AuditLogModel({
            module_id: new Types.ObjectId(assignDto.module_id),
            professor_id: new Types.ObjectId(professorId),
            action: AssignmentActionEnum.ASSIGN,
            performed_by: new Types.ObjectId(user.id),
            performed_by_role: user.role.name as RoleEnum,
            action_description: `Assigned professor to module`,
            new_data: {
              assigned_at: newAssignment.assigned_at,
              assigned_by: newAssignment.assigned_by,
            },
          });
          await auditLog.save();
          auditLogs.push(auditLog);

          results.push({
            professor_id: professorId,
            status: 'assigned',
            message: this.errorMessageService.getSuccessMessageWithLanguage(
              'MODULE',
              'PROFESSOR_ASSIGNED_SUCCESSFULLY',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          });

          // Add notification for professor
          notifications.push({
            professor_id: professorId,
            type: 'assignment_created',
            module_title: module.title,
            module_data: module, // Pass full module data
            assigned_by: user, // Pass user who performed the action
          });
        }
      } catch (error) {
        this.logger.error(`Error assigning professor ${professorId}:`, error);
        results.push({
          professor_id: professorId,
          status: 'error',
          message: this.errorMessageService.getMessageWithLanguage(
            'MODULE',
            'PROFESSOR_ASSIGNMENT_FAILED',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        });
      }
    }

    // Send notifications using the universal notification service
    for (const notification of notifications) {
      try {
        await this.createAssignmentNotification(
          notification.professor_id,
          notification.type,
          notification.module_title,
          school._id,
          notification.module_data, // Pass full module data
          notification.assigned_by, // Pass user who performed the action
        );
      } catch (error) {
        this.logger.error(
          `Error sending notification to professor ${notification.professor_id}:`,
          error,
        );
      }
    }

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'MODULE',
        'PROFESSOR_ASSIGNMENTS_PROCESSED',
        user?.preferred_language || DEFAULT_LANGUAGE,
      ),
      data: {
        module_id: assignDto.module_id,
        module_title: module.title,
        results,
        audit_logs_created: auditLogs.length,
      },
    };
  }

  async manageModuleAssignments(
    manageDto: ManageModuleAssignmentsDto,
    user: JWTUserPayload,
  ): Promise<ManageModuleAssignmentsResponse> {
    this.logger.log(`Managing assignments for module: ${manageDto.module_id}`);

    // Resolve school_id based on user role
    const resolvedSchoolId = this.resolveSchoolId(user, manageDto.school_id);

    // Validate school exists
    const school = await this.schoolModel.findById(
      new Types.ObjectId(resolvedSchoolId),
    );
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'SCHOOL_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);
    const AssignmentModel = tenantConnection.model(
      ModuleProfessorAssignment.name,
      ModuleProfessorAssignmentSchema,
    );
    const AuditLogModel = tenantConnection.model(
      AssignmentAuditLog.name,
      AssignmentAuditLogSchema,
    );

    // Validate module exists
    const module = await ModuleModel.findById(manageDto.module_id);
    if (!module) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'MODULE',
          'MODULE_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Validate all professors exist and are from the same school
    const professorIds = manageDto.professor_ids.map(
      (id) => new Types.ObjectId(id),
    );

    const professors = await this.userModel.find({
      _id: { $in: professorIds },
      school_id: new Types.ObjectId(resolvedSchoolId),
      role: new Types.ObjectId(ROLE_IDS.PROFESSOR),
      deleted_at: null,
    });

    if (professors.length !== manageDto.professor_ids.length) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'PROFESSOR',
          'PROFESSOR_NOT_FOUND_OR_NOT_IN_YOUR_SCHOOL',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get current assignments for this module
    const currentAssignments = await AssignmentModel.find({
      module_id: new Types.ObjectId(manageDto.module_id),
      is_active: true,
    });

    // Get ALL existing assignments for this module (both active and inactive)
    const allExistingAssignments = await AssignmentModel.find({
      module_id: new Types.ObjectId(manageDto.module_id),
    });

    // Create sets for efficient comparison
    const targetProfessorIds = new Set(
      manageDto.professor_ids.map((id) => id.toString()),
    );
    const currentProfessorIds = new Set(
      currentAssignments.map((a) => a.professor_id.toString()),
    );
    const allExistingProfessorIds = new Set(
      allExistingAssignments.map((a) => a.professor_id.toString()),
    );
    // Determine which professors to assign and which to unassign
    const professorsToAssign = manageDto.professor_ids.filter(
      (id) => !currentProfessorIds.has(id.toString()),
    );
    const professorsToUnassign = currentAssignments.filter(
      (assignment) =>
        !targetProfessorIds.has(assignment.professor_id.toString()),
    );
    const results = {
      assigned: [] as AssignmentResult[],
      unassigned: [] as AssignmentResult[],
      unchanged: [] as AssignmentResult[],
    };

    const notifications: NotificationData[] = [];
    const auditLogs: any[] = [];

    // Process assignments (new professors)
    for (const professorId of professorsToAssign) {
      try {
        // Check if there's an existing assignment (active or inactive)
        const existingAssignment = await AssignmentModel.findOne({
          module_id: new Types.ObjectId(manageDto.module_id),
          professor_id: new Types.ObjectId(professorId),
        });

        if (existingAssignment) {
          // Update existing assignment (reactivate it)
          existingAssignment.assigned_by = new Types.ObjectId(user.id);
          existingAssignment.assigned_by_role = user.role.name as RoleEnum;
          existingAssignment.assigned_at = new Date();
          existingAssignment.is_active = true;
          existingAssignment.unassigned_at = null;
          existingAssignment.unassigned_by = null;
          existingAssignment.unassigned_by_role = null;

          await existingAssignment.save();

          // Create audit log
          const auditLog = new AuditLogModel({
            module_id: new Types.ObjectId(manageDto.module_id),
            professor_id: new Types.ObjectId(professorId),
            action: AssignmentActionEnum.ASSIGN,
            performed_by: new Types.ObjectId(user.id),
            performed_by_role: user.role.name as RoleEnum,
            action_description: `Reactivated professor assignment`,
            new_data: {
              assigned_at: existingAssignment.assigned_at,
              assigned_by: existingAssignment.assigned_by,
              is_active: true,
            },
          });
          await auditLog.save();
          auditLogs.push(auditLog);

          results.assigned.push({
            professor_id: professorId,
            status: 'reactivated',
            message: this.errorMessageService.getSuccessMessageWithLanguage(
              'MODULE',
              'PROFESSOR_ASSIGNMENT_REACTIVATED_SUCCESSFULLY',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          });
        } else {
          // Create new assignment
          const newAssignment = new AssignmentModel({
            module_id: new Types.ObjectId(manageDto.module_id),
            professor_id: new Types.ObjectId(professorId),
            assigned_by: new Types.ObjectId(user.id),
            assigned_by_role: user.role.name as RoleEnum,
            assigned_at: new Date(),
            is_active: true,
            unassigned_at: null,
            unassigned_by: null,
            unassigned_by_role: null,
          });

          await newAssignment.save();

          // Create audit log
          const auditLog = new AuditLogModel({
            module_id: new Types.ObjectId(manageDto.module_id),
            professor_id: new Types.ObjectId(professorId),
            action: AssignmentActionEnum.ASSIGN,
            performed_by: new Types.ObjectId(user.id),
            performed_by_role: user.role.name as RoleEnum,
            action_description: `Assigned professor to module`,
            new_data: {
              assigned_at: newAssignment.assigned_at,
              assigned_by: newAssignment.assigned_by,
            },
          });
          await auditLog.save();
          auditLogs.push(auditLog);

          results.assigned.push({
            professor_id: professorId,
            status: 'assigned',
            message: this.errorMessageService.getSuccessMessageWithLanguage(
              'MODULE',
              'PROFESSOR_ASSIGNED_SUCCESSFULLY',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          });
        }

        // Add notification for professor
        notifications.push({
          professor_id: professorId,
          type: 'assignment_created',
          module_title: module.title,
          module_data: module,
          assigned_by: user,
        });
      } catch (error) {
        this.logger.error(`Error assigning professor ${professorId}:`, error);
        results.assigned.push({
          professor_id: professorId,
          status: 'error',
          message: this.errorMessageService.getMessageWithLanguage(
            'MODULE',
            'PROFESSOR_ASSIGNMENT_FAILED',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        });
      }
    }

    // Process unassignments (professors to remove)
    for (const assignment of professorsToUnassign) {
      try {
        // Create audit log before deactivating
        const auditLog = new AuditLogModel({
          module_id: new Types.ObjectId(manageDto.module_id),
          professor_id: assignment.professor_id,
          action: AssignmentActionEnum.UNASSIGN,
          performed_by: new Types.ObjectId(user.id),
          performed_by_role: user.role.name as RoleEnum,
          action_description: `Unassigned professor from module`,
          previous_data: {
            assigned_at: assignment.assigned_at,
            assigned_by: assignment.assigned_by,
            is_active: assignment.is_active,
          },
          new_data: {
            is_active: false,
            unassigned_at: new Date(),
            unassigned_by: new Types.ObjectId(user.id),
            assigned_by: null, // Include assigned_by being set to null
            assigned_by_role: null, // Include assigned_by_role being set to null
            assigned_at: null, // Include assigned_at being set to null
          },
        });
        await auditLog.save();
        auditLogs.push(auditLog);

        // Deactivate assignment
        assignment.is_active = false;
        assignment.unassigned_at = new Date();
        assignment.unassigned_by = new Types.ObjectId(user.id);
        assignment.unassigned_by_role = user.role.name as RoleEnum;
        assignment.assigned_by = null; // Set assigned_by to null when unassigning
        assignment.assigned_by_role = null; // Set assigned_by_role to null when unassigning
        assignment.assigned_at = null; // Set assigned_at to null when unassigning

        await assignment.save();

        results.unassigned.push({
          professor_id: assignment.professor_id.toString(),
          status: 'unassigned',
          message: this.errorMessageService.getSuccessMessageWithLanguage(
            'MODULE',
            'PROFESSOR_UNASSIGNED_SUCCESSFULLY',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        });

        // Add notification for professor
        notifications.push({
          professor_id: assignment.professor_id,
          type: 'assignment_removed',
          module_title: module.title,
          module_data: module,
          assigned_by: user,
        });
      } catch (error) {
        this.logger.error(
          `Error unassigning professor ${assignment.professor_id}:`,
          error,
        );
        results.unassigned.push({
          professor_id: assignment.professor_id.toString(),
          status: 'error',
          message: this.errorMessageService.getMessageWithLanguage(
            'MODULE',
            'PROFESSOR_UNASSIGNMENT_FAILED',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        });
      }
    }

    // Process unchanged assignments (professors that remain assigned)
    const unchangedAssignments = currentAssignments.filter((assignment) =>
      targetProfessorIds.has(assignment.professor_id.toString()),
    );

    for (const assignment of unchangedAssignments) {
      results.unchanged.push({
        professor_id: assignment.professor_id.toString(),
        status: 'unchanged',
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'MODULE',
          'PROFESSOR_ALREADY_ASSIGNED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      });
    }

    // Send notifications using the universal notification service
    for (const notification of notifications) {
      try {
        await this.createAssignmentNotification(
          notification.professor_id,
          notification.type,
          notification.module_title,
          school._id,
          notification.module_data,
          notification.assigned_by,
        );
      } catch (error) {
        this.logger.error(
          `Error sending notification to professor ${notification.professor_id}:`,
          error,
        );
      }
    }

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'MODULE',
        'MODULE_ASSIGNMENTS_MANAGED_SUCCESSFULLY',
        user?.preferred_language || DEFAULT_LANGUAGE,
      ),
      data: {
        module_id: manageDto.module_id,
        module_title: module.title,
        summary: {
          total_assigned: results.assigned.length,
          total_unassigned: results.unassigned.length,
          total_unchanged: results.unchanged.length,
          total_processed:
            results.assigned.length +
            results.unassigned.length +
            results.unchanged.length,
        },
        results,
        audit_logs_created: auditLogs.length,
      },
    };
  }

  async unassignProfessorFromModule(
    unassignDto: UnassignProfessorDto,
    user: JWTUserPayload,
  ) {
    this.logger.log(
      `Unassigning professor ${unassignDto.professor_id} from module ${unassignDto.module_id}`,
    );

    // Resolve school_id based on user role
    const resolvedSchoolId = this.resolveSchoolId(user, unassignDto.school_id);

    // Validate school exists
    const school = await this.schoolModel.findById(
      new Types.ObjectId(resolvedSchoolId),
    );
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'SCHOOL_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);
    const AssignmentModel = tenantConnection.model(
      ModuleProfessorAssignment.name,
      ModuleProfessorAssignmentSchema,
    );
    const AuditLogModel = tenantConnection.model(
      AssignmentAuditLog.name,
      AssignmentAuditLogSchema,
    );

    // Validate module exists
    const module = await ModuleModel.findById(
      new Types.ObjectId(unassignDto.module_id),
    );
    if (!module) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'MODULE',
          'MODULE_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Validate professor exists
    const professor = await this.userModel.findOne({
      _id: new Types.ObjectId(unassignDto.professor_id),
      school_id: new Types.ObjectId(resolvedSchoolId),
      role: new Types.ObjectId(ROLE_IDS.PROFESSOR), // PROFESSOR role ID
      deleted_at: null,
    });

    if (!professor) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'PROFESSOR',
          'PROFESSOR_NOT_FOUND_OR_NOT_IN_YOUR_SCHOOL',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Find and deactivate assignment
    const assignment = await AssignmentModel.findOne({
      module_id: new Types.ObjectId(unassignDto.module_id),
      professor_id: new Types.ObjectId(unassignDto.professor_id),
      is_active: true,
    });

    if (!assignment) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'MODULE',
          'PROFESSOR_NOT_ASSIGNED_TO_MODULE',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Create audit log before deactivating
    const auditLog = new AuditLogModel({
      module_id: new Types.ObjectId(unassignDto.module_id),
      professor_id: new Types.ObjectId(unassignDto.professor_id),
      action: AssignmentActionEnum.UNASSIGN,
      performed_by: new Types.ObjectId(user.id),
      performed_by_role: user.role.name as RoleEnum,
      action_description: `Unassigned professor from module`,
      previous_data: {
        assigned_at: assignment.assigned_at,
        assigned_by: assignment.assigned_by,
        is_active: assignment.is_active,
      },
      new_data: {
        is_active: false,
        unassigned_at: new Date(),
        unassigned_by: new Types.ObjectId(user.id),
        assigned_by: null, // Include assigned_by being set to null
        assigned_by_role: null, // Include assigned_by_role being set to null
        assigned_at: null, // Include assigned_at being set to null
      },
    });
    await auditLog.save();

    // Deactivate assignment
    assignment.is_active = false;
    assignment.unassigned_at = new Date();
    assignment.unassigned_by = new Types.ObjectId(user.id);
    assignment.unassigned_by_role = user.role.name as RoleEnum;
    assignment.assigned_by = null; // Set assigned_by to null when unassigning
    assignment.assigned_by_role = null; // Set assigned_by_role to null when unassigning
    assignment.assigned_at = null; // Set assigned_at to null when unassigning

    await assignment.save();

    // Send notification using the universal notification service
    try {
      await this.createAssignmentNotification(
        new Types.ObjectId(unassignDto.professor_id),
        'assignment_removed',
        module.title,
        school._id,
        module, // Pass full module data
        user, // Pass user who performed the action
      );
    } catch (error) {
      this.logger.error(
        `Error sending unassignment notification to professor ${unassignDto.professor_id}:`,
        error,
      );
    }

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'MODULE',
        'PROFESSOR_UNASSIGNED_SUCCESSFULLY',
        user?.preferred_language || DEFAULT_LANGUAGE,
      ),
      data: {
        module_id: unassignDto.module_id,
        module_title: module.title,
        professor_id: unassignDto.professor_id,
        professor_name: `${professor.first_name} ${professor.last_name}`.trim(),
        audit_log_created: auditLog._id,
      },
    };
  }

  async getModuleAssignments(
    moduleId: Types.ObjectId,
    user: JWTUserPayload,
    school_id?: string | Types.ObjectId,
  ) {
    this.logger.log(`Getting assignments for module: ${moduleId}`);

    // Resolve school_id based on user role
    const resolvedSchoolId = this.resolveSchoolId(user, school_id);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'SCHOOL_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);

    // Register tenant models
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);
    const AssignmentModel = tenantConnection.model(
      ModuleProfessorAssignment.name,
      ModuleProfessorAssignmentSchema,
    );

    // Validate module exists
    const module = await ModuleModel.findById(moduleId);
    if (!module) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'MODULE',
          'MODULE_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get active assignments (NO populate)
    const assignments = await AssignmentModel.find({
      module_id: new Types.ObjectId(moduleId),
      is_active: true,
    });

    // Get professor_ids
    const professorIds = assignments.map((a) => a.professor_id);

    // Fetch professor details
    const professors = await this.userModel
      .find({
        _id: { $in: professorIds },
      })
      .select('first_name last_name email');

    // Create map for fast lookup
    const professorMap = new Map(
      professors.map((prof) => [prof._id.toString(), prof]),
    );

    // Merge assignments with professor data
    const assignmentData = assignments.map((assignment) => {
      const prof = professorMap.get(assignment.professor_id.toString());
      return {
        id: assignment._id,
        professor_id: assignment.professor_id,
        professor_name: prof
          ? `${prof.first_name} ${prof.last_name}`.trim()
          : 'N/A',
        professor_email: prof?.email ?? 'N/A',
        assigned_at: assignment.assigned_at,
        assigned_by: assignment.assigned_by,
      };
    });

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'MODULE',
        'MODULE_ASSIGNMENTS_RETRIEVED_SUCCESSFULLY',
        user?.preferred_language || DEFAULT_LANGUAGE,
      ),
      data: {
        module_id: moduleId,
        module_title: module.title,
        assignments: assignmentData,
        total_assignments: assignmentData.length,
      },
    };
  }

  async getProfessorAssignments(
    professorId: Types.ObjectId,
    user: JWTUserPayload,
    paginationDto?: PaginationDto,
    school_id?: string | Types.ObjectId,
  ) {
    this.logger.log(`Getting assignments for professor: ${professorId}`);

    // Resolve school_id based on user role
    const resolvedSchoolId = this.resolveSchoolId(user, school_id);

    // Validate school exists
    const school = await this.schoolModel.findById(
      new Types.ObjectId(resolvedSchoolId),
    );
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'SCHOOL_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);
    const AssignmentModel = tenantConnection.model(
      ModuleProfessorAssignment.name,
      ModuleProfessorAssignmentSchema,
    );

    // Validate professor exists
    const professor = await this.userModel.findOne({
      _id: new Types.ObjectId(professorId),
      school_id: new Types.ObjectId(resolvedSchoolId),
      role: new Types.ObjectId(ROLE_IDS.PROFESSOR), // PROFESSOR role ID
      deleted_at: null,
    });

    if (!professor) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'PROFESSOR',
          'PROFESSOR_NOT_FOUND_OR_NOT_IN_YOUR_SCHOOL',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get pagination options
    const paginationOptions = getPaginationOptions(paginationDto || {});

    // Get active assignments with module details
    const assignments = await AssignmentModel.find({
      professor_id: professorId,
      is_active: true,
    })
      .populate(
        'module_id',
        'title subject description category difficulty duration tags thumbnail published',
      )
      .skip(paginationOptions.skip)
      .limit(paginationOptions.limit)
      .sort({ assigned_at: -1 });

    const total = await AssignmentModel.countDocuments({
      professor_id: new Types.ObjectId(professorId),
      is_active: true,
    });

    const assignmentData = assignments.map((assignment) => ({
      id: assignment._id,
      module_id: assignment.module_id._id,
      module_title: (assignment.module_id as any).title,
      module_subject: (assignment.module_id as any).subject,
      module_description: (assignment.module_id as any).description,
      module_category: (assignment.module_id as any).category,
      module_difficulty: (assignment.module_id as any).difficulty,
      module_duration: (assignment.module_id as any).duration,
      module_tags: (assignment.module_id as any).tags,
      module_thumbnail: (assignment.module_id as any).thumbnail,
      module_published: (assignment.module_id as any).published,
      assigned_at: assignment.assigned_at,
      assigned_by: assignment.assigned_by,
    }));

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'MODULE',
        'PROFESSOR_ASSIGNMENTS_RETRIEVED_SUCCESSFULLY',
        user?.preferred_language || DEFAULT_LANGUAGE,
      ),
      data: {
        professor_id: professorId,
        professor_name: `${professor.first_name} ${professor.last_name}`.trim(),
        professor_email: professor.email,
        assignments: assignmentData,
        pagination: {
          page: paginationOptions.page,
          limit: paginationOptions.limit,
          total,
          totalPages: Math.ceil(total / paginationOptions.limit),
          hasNext:
            paginationOptions.page < Math.ceil(total / paginationOptions.limit),
          hasPrev: paginationOptions.page > 1,
        },
      },
    };
  }

  async checkProfessorModuleAccess(
    professorId: Types.ObjectId,
    moduleId: Types.ObjectId,
    user: JWTUserPayload,
    school_id?: string | Types.ObjectId,
  ) {
    this.logger.log(
      `Checking access for professor ${professorId} to module ${moduleId}`,
    );

    // Resolve school_id based on user role
    const resolvedSchoolId = this.resolveSchoolId(user, school_id);

    // Validate school exists
    const school = await this.schoolModel.findById(
      new Types.ObjectId(resolvedSchoolId),
    );
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'SCHOOL_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const AssignmentModel = tenantConnection.model(
      ModuleProfessorAssignment.name,
      ModuleProfessorAssignmentSchema,
    );

    // Check if professor is assigned to module
    const assignment = await AssignmentModel.findOne({
      module_id: new Types.ObjectId(moduleId),
      professor_id: new Types.ObjectId(professorId),
      is_active: true,
    });

    return {
      has_access: !!assignment,
      assignment_id: assignment?._id || null,
    };
  }

  async getAssignmentAuditLogs(
    user: JWTUserPayload,
    moduleId?: Types.ObjectId,
    professorId?: Types.ObjectId,
    paginationDto?: PaginationDto,
    school_id?: string | Types.ObjectId,
  ) {
    this.logger.log(`Getting assignment audit logs`);

    // Resolve school_id based on user role
    const resolvedSchoolId = this.resolveSchoolId(user, school_id);

    // Validate school exists
    const school = await this.schoolModel.findById(
      new Types.ObjectId(resolvedSchoolId),
    );
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'SCHOOL_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const AuditLogModel = tenantConnection.model(
      AssignmentAuditLog.name,
      AssignmentAuditLogSchema,
    );

    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);

    // Build query
    const query: any = {};
    if (moduleId) {
      query.module_id = new Types.ObjectId(moduleId);
    }
    if (professorId) {
      query.professor_id = new Types.ObjectId(professorId);
    }

    // Get pagination options
    const paginationOptions = getPaginationOptions(paginationDto || {});

    // Get audit logs with pagination (without user population)
    const auditLogs = await AuditLogModel.find(query)
      .populate(
        'module_id',
        'title subject description category difficulty duration tags thumbnail published',
      )
      .skip(paginationOptions.skip)
      .limit(paginationOptions.limit)
      .sort({ created_at: -1 });

    const total = await AuditLogModel.countDocuments(query);

    // Get user IDs for population from central database
    const userIds = new Set<string>();
    auditLogs.forEach((log) => {
      if (log.professor_id) userIds.add(log.professor_id.toString());
      if (log.performed_by) userIds.add(log.performed_by.toString());
    });

    // Fetch users from central database
    const userIdArray = Array.from(userIds);
    const users = await this.userModel.find(
      {
        _id: {
          $in: userIdArray.map((id: string) => new Types.ObjectId(id)),
        },
      },
      'first_name last_name email',
    );

    // Create a map for quick user lookup
    const userMap = new Map();
    users.forEach((user) => {
      userMap.set(user._id.toString(), user);
    });

    const auditLogData = auditLogs.map((log) => {
      const professor = log.professor_id
        ? userMap.get(log.professor_id.toString())
        : null;
      const performedBy = log.performed_by
        ? userMap.get(log.performed_by.toString())
        : null;

      return {
        id: log._id,
        module_id: log.module_id._id,
        module_title: (log.module_id as any).title,
        professor_id: log.professor_id,
        professor_name: professor
          ? `${professor.first_name} ${professor.last_name}`.trim()
          : 'Unknown Professor',
        professor_email: professor?.email || 'N/A',
        action: log.action,
        performed_by: log.performed_by,
        performed_by_name: performedBy
          ? `${performedBy.first_name} ${performedBy.last_name}`.trim()
          : 'Unknown User',
        performed_by_email: performedBy?.email || 'N/A',
        performed_by_role: log.performed_by_role,
        action_description: log.action_description,
        previous_data: log.previous_data,
        new_data: log.new_data,
        reason: log.reason,
        created_at: log.created_at,
      };
    });

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'MODULE',
        'ASSIGNMENT_AUDIT_LOGS_RETRIEVED_SUCCESSFULLY',
        user?.preferred_language || DEFAULT_LANGUAGE,
      ),
      data: {
        audit_logs: auditLogData,
        pagination: {
          page: paginationOptions.page,
          limit: paginationOptions.limit,
          total,
          totalPages: Math.ceil(total / paginationOptions.limit),
          hasNext:
            paginationOptions.page < Math.ceil(total / paginationOptions.limit),
          hasPrev: paginationOptions.page > 1,
        },
      },
    };
  }

  private async createAssignmentNotification(
    professorId: string | Types.ObjectId,
    type: string,
    moduleTitle: string,
    schoolId: Types.ObjectId,
    moduleData?: any,
    assignedBy?: JWTUserPayload,
  ) {
    this.logger.log(
      `Creating ${type} notification for professor ${professorId} for module ${moduleTitle}`,
    );

    try {
      const professorObjectId =
        typeof professorId === 'string'
          ? new Types.ObjectId(professorId)
          : professorId;

      let titleEn = '';
      let titleFr = '';
      let messageEn = '';
      let messageFr = '';
      let notificationType: NotificationTypeEnum;

      // Get module details for better context
      const moduleDetails = moduleData || {};

      // Get assigned by user details if available
      let assignedByName = 'System Administrator';
      if (assignedBy?.id) {
        try {
          const assignedByUser = await this.userModel
            .findById(assignedBy.id)
            .select('first_name last_name');
          if (assignedByUser) {
            assignedByName =
              `${assignedByUser.first_name} ${assignedByUser.last_name}`.trim();
          }
        } catch (error) {
          this.logger.warn(
            `Could not fetch assigned by user details: ${error.message}`,
          );
        }
      }

      switch (type) {
        case 'assignment_created':
          titleEn = 'New Module Assignment';
          titleFr = 'Nouvelle Attribution de Module';
          messageEn = `You have been assigned to the module "${moduleTitle}" by ${assignedByName}. You now have full access to view, edit, and manage this module.`;
          messageFr = `Vous avez été assigné au module "${moduleTitle}" par ${assignedByName}. Vous avez maintenant un accès complet pour voir, modifier et gérer ce module.`;
          notificationType = NotificationTypeEnum.PROFESSOR_ASSIGNED;
          break;
        case 'assignment_updated':
          titleEn = 'Module Assignment Updated';
          titleFr = 'Attribution de Module Mise à Jour';
          messageEn = `Your assignment to the module "${moduleTitle}" has been updated by ${assignedByName}.`;
          messageFr = `Votre attribution au module "${moduleTitle}" a été mise à jour par ${assignedByName}.`;
          notificationType = NotificationTypeEnum.PROFESSOR_ASSIGNED;
          break;
        case 'assignment_removed':
          titleEn = 'Module Assignment Removed';
          titleFr = 'Attribution de Module Supprimée';
          messageEn = `You have been unassigned from the module "${moduleTitle}" by ${assignedByName}. You no longer have access to this module.`;
          messageFr = `Vous avez été désassigné du module "${moduleTitle}" par ${assignedByName}. Vous n'avez plus accès à ce module.`;
          notificationType = NotificationTypeEnum.PROFESSOR_UNASSIGNED;
          break;
        default:
          titleEn = 'Module Assignment Notification';
          titleFr = "Notification d'Attribution de Module";
          messageEn = `There has been a change to your module assignment for "${moduleTitle}" by ${assignedByName}.`;
          messageFr = `Il y a eu un changement dans votre attribution de module pour "${moduleTitle}" par ${assignedByName}.`;
          notificationType = NotificationTypeEnum.GENERAL;
      }

      // Enhanced metadata with more relevant data
      const metadata = {
        module_id: moduleDetails._id || null,
        module_title: moduleTitle,
        module_subject: moduleDetails.subject || null,
        module_category: moduleDetails.category || null,
        module_difficulty: moduleDetails.difficulty || null,
        module_duration: moduleDetails.duration || null,
        module_description: moduleDetails.description || null,
        assignment_type: type,
        assigned_by: assignedBy?.id || null,
        assigned_by_name: assignedByName,
        assigned_by_role: assignedBy?.role?.name || null,
        school_id: schoolId,
        timestamp: new Date(),
        action_context: {
          action: type,
          module_info: {
            title: moduleTitle,
            subject: moduleDetails.subject,
            category: moduleDetails.category,
            difficulty: moduleDetails.difficulty,
            duration: moduleDetails.duration,
            published: moduleDetails.published,
            thumbnail: moduleDetails.thumbnail,
          },
          assignment_info: {
            assigned_at: new Date(),
            assigned_by: assignedByName,
            assigned_by_role: assignedBy?.role?.name,
          },
        },
      };

      // Use the universal notification service
      await this.notificationsService.createMultiLanguageNotification(
        professorObjectId,
        RecipientTypeEnum.PROFESSOR,
        titleEn,
        titleFr,
        messageEn,
        messageFr,
        notificationType,
        metadata,
        schoolId,
      );

      this.logger.log(
        `Notification created successfully for professor ${professorId} with enhanced metadata`,
      );
    } catch (error) {
      this.logger.error(
        `Error creating notification for professor ${professorId}:`,
        error,
      );
      throw error;
    }
  }
}
