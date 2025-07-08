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
  Module,
  ModuleSchema,
} from 'src/database/schemas/tenant/module.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { RoleEnum } from 'src/common/constants/roles.constant';

@Injectable()
export class ModulesService {
  private readonly logger = new Logger(ModulesService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
  ) {}

  async createModule(createModuleDto: CreateModuleDto, user: JWTUserPayload) {
    const { title, subject, description, category, duration, difficulty } =
      createModuleDto;

    this.logger.log(`Creating module: ${title} by user: ${user.id}`);

    // Validate school exists and user has access
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);

    try {
      // Create module in tenant database
      const newModule = new ModuleModel({
        title,
        subject,
        description,
        category,
        duration,
        difficulty,
        created_by: new Types.ObjectId(user.id),
        created_by_role: user.role.name as RoleEnum,
      });

      const savedModule = await newModule.save();

      this.logger.log(`Module created in tenant DB: ${savedModule._id}`);

      return {
        message: 'Module created successfully',
        data: {
          id: savedModule._id,
          title: savedModule.title,
          subject: savedModule.subject,
          description: savedModule.description,
          category: savedModule.category,
          duration: savedModule.duration,
          difficulty: savedModule.difficulty,
          created_by: savedModule.created_by,
          created_by_role: savedModule.created_by_role,
          created_at: savedModule.created_at,
          updated_at: savedModule.updated_at,
        },
      };
    } catch (error) {
      this.logger.error('Error creating module', error?.stack || error);
      throw new BadRequestException('Failed to create module');
    }
  }

  async findAllModules(user: JWTUserPayload) {
    this.logger.log(`Finding all modules for user: ${user.id}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);

    try {
      const modules = await ModuleModel.find({ deleted_at: null })
        .sort({ created_at: -1 })
        .lean();

      // Get user details for created_by fields
      const userIds = [...new Set(modules.map((module) => module.created_by))];
      const users = await this.userModel
        .find({ _id: { $in: userIds } })
        .select('first_name last_name email')
        .lean();

      const userMap = users.reduce((map, user) => {
        map[user._id.toString()] = user;
        return map;
      }, {});

      // Attach user details to modules
      const modulesWithUsers = modules.map((module) => ({
        ...module,
        created_by_user: userMap[module.created_by.toString()] || null,
      }));

      return {
        message: 'Modules retrieved successfully',
        data: modulesWithUsers,
      };
    } catch (error) {
      this.logger.error('Error finding modules', error?.stack || error);
      throw new BadRequestException('Failed to retrieve modules');
    }
  }

  async findModuleById(id: string | Types.ObjectId, user: JWTUserPayload) {
    this.logger.log(`Finding module by id: ${id} for user: ${user.id}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);

    try {
      const module = await ModuleModel.findOne({
        _id: id,
        deleted_at: null,
      }).lean();

      if (!module) {
        throw new NotFoundException('Module not found');
      }

      // Get user details for created_by field
      const createdByUser = await this.userModel
        .findById(module.created_by)
        .select('first_name last_name email')
        .lean();

      const moduleWithUser = {
        ...module,
        created_by_user: createdByUser || null,
      };

      return {
        message: 'Module retrieved successfully',
        data: moduleWithUser,
      };
    } catch (error) {
      this.logger.error('Error finding module', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve module');
    }
  }

  async updateModule(
    id: Types.ObjectId,
    updateModuleDto: UpdateModuleDto,
    user: JWTUserPayload,
  ) {
    this.logger.log(`Updating module: ${id} by user: ${user.id}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);

    try {
      const updatedModule = await ModuleModel.findOneAndUpdate(
        { _id: id, deleted_at: null },
        { ...updateModuleDto, updated_at: new Date() },
        { new: true },
      ).lean();

      if (!updatedModule) {
        throw new NotFoundException('Module not found');
      }

      // Get user details for created_by field
      const createdByUser = await this.userModel
        .findById(updatedModule.created_by)
        .select('first_name last_name email')
        .lean();

      const moduleWithUser = {
        ...updatedModule,
        created_by_user: createdByUser || null,
      };

      return {
        message: 'Module updated successfully',
        data: moduleWithUser,
      };
    } catch (error) {
      this.logger.error('Error updating module', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update module');
    }
  }

  async removeModule(id: Types.ObjectId, user: JWTUserPayload) {
    this.logger.log(`Removing module: ${id} by user: ${user.id}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);

    try {
      const deletedModule = await ModuleModel.findOneAndUpdate(
        { _id: id, deleted_at: null },
        { deleted_at: new Date() },
        { new: true },
      );

      if (!deletedModule) {
        throw new NotFoundException('Module not found');
      }

      return {
        message: 'Module deleted successfully',
        data: { id: deletedModule._id },
      };
    } catch (error) {
      this.logger.error('Error removing module', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete module');
    }
  }
}
