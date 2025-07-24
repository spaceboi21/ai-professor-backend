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

interface AssignmentResult {
  professor_id: string | Types.ObjectId;
  status: string;
  message: string;
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
          'School ID is required in request body/query for super admin',
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

  async assignProfessorsToModule(
    assignDto: AssignProfessorDto,
    user: JWTUserPayload,
  ) {
    console.log('anushka');
    this.logger.log(`Assigning professors to module: ${assignDto.module_id}`);

    // Resolve school_id based on user role
    const resolvedSchoolId = this.resolveSchoolId(user, assignDto.school_id);

    // Validate school exists
    const school = await this.schoolModel.findById(
      new Types.ObjectId(resolvedSchoolId),
    );
    if (!school) {
      throw new NotFoundException('School not found');
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
      throw new NotFoundException('Module not found');
    }
    // Validate all professors exist and are from the same school
    const professorIds = assignDto.professor_ids.map(
      (id) => new Types.ObjectId(id),
    );

    console.log({
      _id: { $in: professorIds },
      school_id: new Types.ObjectId(resolvedSchoolId),
      role: new Types.ObjectId(ROLE_IDS.PROFESSOR), // PROFESSOR role ID
      deleted_at: null,
    });
    const professors = await this.userModel.find({
      _id: { $in: professorIds },
      school_id: new Types.ObjectId(resolvedSchoolId),
      role: new Types.ObjectId(ROLE_IDS.PROFESSOR), // PROFESSOR role ID
      deleted_at: null,
    });
    console.log(professors);
    if (professors.length !== assignDto.professor_ids.length) {
      throw new NotFoundException(
        'One or more professors not found or not from this school',
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
            message: 'Assignment updated successfully',
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
            message: 'Professor assigned successfully',
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
          message: 'Failed to assign professor',
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
      message: 'Professor assignments processed',
      data: {
        module_id: assignDto.module_id,
        module_title: module.title,
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
      throw new NotFoundException('School not found');
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
      throw new NotFoundException('Module not found');
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
        'Professor not found or not from this school',
      );
    }

    // Find and deactivate assignment
    const assignment = await AssignmentModel.findOne({
      module_id: new Types.ObjectId(unassignDto.module_id),
      professor_id: new Types.ObjectId(unassignDto.professor_id),
      is_active: true,
    });

    if (!assignment) {
      throw new NotFoundException('Professor is not assigned to this module');
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
      },
    });
    await auditLog.save();

    // Deactivate assignment
    assignment.is_active = false;
    assignment.unassigned_at = new Date();
    assignment.unassigned_by = new Types.ObjectId(user.id);
    assignment.unassigned_by_role = user.role.name as RoleEnum;

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
      message: 'Professor unassigned successfully',
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
      throw new NotFoundException('School not found');
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);
    const AssignmentModel = tenantConnection.model(
      ModuleProfessorAssignment.name,
      ModuleProfessorAssignmentSchema,
    );

    // Validate module exists
    const module = await ModuleModel.findById(moduleId);
    if (!module) {
      throw new NotFoundException('Module not found');
    }

    // Get active assignments
    const assignments = await AssignmentModel.find({
      module_id: new Types.ObjectId(moduleId),
      is_active: true,
    }).populate('professor_id', 'first_name last_name email');

    const assignmentData = assignments.map((assignment) => ({
      id: assignment._id,
      professor_id: assignment.professor_id._id,
      professor_name:
        `${(assignment.professor_id as any).first_name} ${(assignment.professor_id as any).last_name}`.trim(),
      professor_email: (assignment.professor_id as any).email,
      assigned_at: assignment.assigned_at,
      assigned_by: assignment.assigned_by,
    }));

    return {
      message: 'Module assignments retrieved successfully',
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
      throw new NotFoundException('School not found');
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
        'Professor not found or not from this school',
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
      message: 'Professor assignments retrieved successfully',
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
      throw new NotFoundException('School not found');
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
      throw new NotFoundException('School not found');
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
      message: 'Assignment audit logs retrieved successfully',
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

      let title: string;
      let message: string;
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
          title = 'New Module Assignment';
          message = `You have been assigned to the module "${moduleTitle}" by ${assignedByName}. You now have full access to view, edit, and manage this module.`;
          notificationType = NotificationTypeEnum.PROFESSOR_ASSIGNED;
          break;
        case 'assignment_updated':
          title = 'Module Assignment Updated';
          message = `Your assignment to the module "${moduleTitle}" has been updated by ${assignedByName}.`;
          notificationType = NotificationTypeEnum.PROFESSOR_ASSIGNED;
          break;
        case 'assignment_removed':
          title = 'Module Assignment Removed';
          message = `You have been unassigned from the module "${moduleTitle}" by ${assignedByName}. You no longer have access to this module.`;
          notificationType = NotificationTypeEnum.PROFESSOR_UNASSIGNED;
          break;
        default:
          title = 'Module Assignment Notification';
          message = `There has been a change to your module assignment for "${moduleTitle}" by ${assignedByName}.`;
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
      await this.notificationsService.createNotification(
        professorObjectId,
        RecipientTypeEnum.PROFESSOR,
        title,
        message,
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
