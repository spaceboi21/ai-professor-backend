import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from 'src/database/schemas/central/user.schema';
import { School } from 'src/database/schemas/central/school.schema';
import {
  Student,
  StudentSchema,
} from 'src/database/schemas/tenant/student.schema';
import {
  Notification,
  NotificationSchema,
} from 'src/database/schemas/tenant/notification.schema';
import {
  NotificationTypeEnum,
  NotificationStatusEnum,
} from 'src/common/constants/notification.constant';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  getPaginationOptions,
  createPaginationResult,
} from 'src/common/utils/pagination.util';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
  ) {}

  async createNotification(
    studentId: Types.ObjectId,
    title: string,
    message: string,
    type: NotificationTypeEnum,
    metadata: Record<string, any> = {},
  ) {
    this.logger.log(`Creating notification for student: ${studentId}`);

    // For individual notifications, we need to get the student's school
    // This method should be used with proper student context
    throw new BadRequestException(
      'Individual notification creation requires student context',
    );
  }

  async createModulePublishedNotification(
    schoolId: Types.ObjectId,
    moduleTitle: string,
    moduleId: Types.ObjectId,
  ) {
    this.logger.log(
      `Creating module published notifications for school: ${schoolId}`,
    );

    // Validate school exists
    const school = await this.schoolModel.findById(
      new Types.ObjectId(schoolId),
    );
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StudentModel = tenantConnection.model(Student.name, StudentSchema);
    const NotificationModel = tenantConnection.model(
      Notification.name,
      NotificationSchema,
    );

    try {
      // Find all students in the school
      const students = await StudentModel.find({
        school_id: new Types.ObjectId(schoolId),
        deleted_at: null,
      }).lean();

      this.logger.log(
        `Found ${students.length} students in school: ${school.name}`,
      );

      if (students.length === 0) {
        return {
          message: 'No students found in school',
          data: {
            notifications_created: 0,
            total_students: 0,
            module_title: moduleTitle,
            module_id: moduleId,
          },
        };
      }

      const title = 'New Module Available!';
      const message = `A new module "${moduleTitle}" has been published and is now available for you to study.`;
      const metadata = {
        module_id: moduleId,
        module_title: moduleTitle,
      };

      // Prepare bulk notification documents
      const notificationDocuments = students.map((student) => ({
        student_id: new Types.ObjectId(student._id),
        title,
        message,
        type: NotificationTypeEnum.MODULE_PUBLISHED,
        metadata,
        status: NotificationStatusEnum.UNREAD,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      // Bulk insert all notifications
      const result = await NotificationModel.insertMany(notificationDocuments);

      this.logger.log(`Created ${result.length} notifications successfully`);

      return {
        message: 'Module published notifications created successfully',
        data: {
          notifications_created: result.length,
          total_students: students.length,
          module_title: moduleTitle,
          module_id: moduleId,
        },
      };
    } catch (error) {
      this.logger.error(
        'Error creating module published notifications',
        error?.stack || error,
      );
      throw new BadRequestException(
        'Failed to create module published notifications',
      );
    }
  }

  async createModuleUnpublishedNotification(
    schoolId: Types.ObjectId,
    moduleTitle: string,
    moduleId: Types.ObjectId,
  ) {
    this.logger.log(
      `Creating module unpublished notifications for school: ${schoolId}`,
    );

    // Validate school exists
    const school = await this.schoolModel.findById(
      new Types.ObjectId(schoolId),
    );
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StudentModel = tenantConnection.model(Student.name, StudentSchema);
    const NotificationModel = tenantConnection.model(
      Notification.name,
      NotificationSchema,
    );

    try {
      // Find all students in the school
      const students = await StudentModel.find({
        school_id: new Types.ObjectId(schoolId),
        deleted_at: null,
      }).lean();

      this.logger.log(
        `Found ${students.length} students in school: ${school.name}`,
      );

      if (students.length === 0) {
        return {
          message: 'No students found in school',
          data: {
            notifications_created: 0,
            total_students: 0,
            module_title: moduleTitle,
            module_id: moduleId,
          },
        };
      }

      const title = 'Module Unavailable';
      const message = `The module "${moduleTitle}" has been unpublished and is no longer available.`;
      const metadata = {
        module_id: moduleId,
        module_title: moduleTitle,
      };

      // Prepare bulk notification documents
      const notificationDocuments = students.map((student) => ({
        student_id: student._id,
        title,
        message,
        type: NotificationTypeEnum.MODULE_UNPUBLISHED,
        metadata,
        status: NotificationStatusEnum.UNREAD,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      // Bulk insert all notifications
      const result = await NotificationModel.insertMany(notificationDocuments);

      this.logger.log(`Created ${result.length} notifications successfully`);

      return {
        message: 'Module unpublished notifications created successfully',
        data: {
          notifications_created: result.length,
          total_students: students.length,
          module_title: moduleTitle,
          module_id: moduleId,
        },
      };
    } catch (error) {
      this.logger.error(
        'Error creating module unpublished notifications',
        error?.stack || error,
      );
      throw new BadRequestException(
        'Failed to create module unpublished notifications',
      );
    }
  }

  async getStudentNotifications(
    user: JWTUserPayload,
    paginationDto?: PaginationDto,
  ) {
    this.logger.log(`Getting notifications for student: ${user.id}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const NotificationModel = tenantConnection.model(
      Notification.name,
      NotificationSchema,
    );

    try {
      const paginationOptions = getPaginationOptions(paginationDto || {});

      const query = {
        student_id: new Types.ObjectId(user.id),
        deleted_at: null,
      };

      // Get total count for pagination
      const total = await NotificationModel.countDocuments(query);

      // Get paginated notifications
      const notifications = await NotificationModel.find(query)
        .sort({ created_at: -1 })
        .skip(paginationOptions.skip)
        .limit(paginationOptions.limit)
        .lean();

      // Create pagination result
      const result = createPaginationResult(
        notifications,
        total,
        paginationOptions,
      );

      return {
        message: 'Notifications retrieved successfully',
        data: result.data,
        pagination_data: result.pagination_data,
      };
    } catch (error) {
      this.logger.error('Error getting notifications', error?.stack || error);
      throw new BadRequestException('Failed to retrieve notifications');
    }
  }

  async markNotificationAsRead(
    notificationId: Types.ObjectId,
    user: JWTUserPayload,
  ) {
    this.logger.log(`Marking notification as read: ${notificationId}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const NotificationModel = tenantConnection.model(
      Notification.name,
      NotificationSchema,
    );

    try {
      const notification = await NotificationModel.findOneAndUpdate(
        {
          _id: notificationId,
          student_id: new Types.ObjectId(user.id),
          deleted_at: null,
        },
        {
          status: NotificationStatusEnum.READ,
          read_at: new Date(),
        },
        { new: true },
      ).lean();

      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      return {
        message: 'Notification marked as read',
        data: notification,
      };
    } catch (error) {
      this.logger.error(
        'Error marking notification as read',
        error?.stack || error,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to mark notification as read');
    }
  }

  async markAllNotificationsAsRead(user: JWTUserPayload) {
    this.logger.log(
      `Marking all notifications as read for student: ${user.id}`,
    );

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const NotificationModel = tenantConnection.model(
      Notification.name,
      NotificationSchema,
    );

    try {
      const result = await NotificationModel.updateMany(
        {
          student_id: new Types.ObjectId(user.id),
          status: NotificationStatusEnum.UNREAD,
          deleted_at: null,
        },
        {
          status: NotificationStatusEnum.READ,
          read_at: new Date(),
        },
      );

      return {
        message: 'All notifications marked as read',
        data: {
          modified_count: result.modifiedCount,
        },
      };
    } catch (error) {
      this.logger.error(
        'Error marking all notifications as read',
        error?.stack || error,
      );
      throw new BadRequestException('Failed to mark notifications as read');
    }
  }

  async getUnreadCount(user: JWTUserPayload) {
    this.logger.log(`Getting unread count for student: ${user.id}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const NotificationModel = tenantConnection.model(
      Notification.name,
      NotificationSchema,
    );

    try {
      const count = await NotificationModel.countDocuments({
        student_id: new Types.ObjectId(user.id),
        status: NotificationStatusEnum.UNREAD,
        deleted_at: null,
      });

      return {
        message: 'Unread count retrieved successfully',
        data: {
          unread_count: count,
        },
      };
    } catch (error) {
      this.logger.error('Error getting unread count', error?.stack || error);
      throw new BadRequestException('Failed to get unread count');
    }
  }
}
