import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { School } from 'src/database/schemas/central/school.schema';
import { Module, ModuleSchema } from 'src/database/schemas/tenant/module.schema';
import { Chapter, ChapterSchema } from 'src/database/schemas/tenant/chapter.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';

export interface ModuleAuditResult {
  school_id: string;
  school_name: string;
  total_modules: number;
  modules_with_chapters: number;
  modules_without_chapters: number;
  orphaned_modules: ModuleWithChapterCount[];
  duplicate_module_titles: DuplicateModuleGroup[];
  recommendations: string[];
}

export interface ModuleWithChapterCount {
  module_id: string;
  title: string;
  chapter_count: number;
  created_at: Date;
  year?: number;
}

export interface DuplicateModuleGroup {
  title: string;
  modules: ModuleWithChapterCount[];
  total_duplicates: number;
  has_chapters_conflict: boolean; // Some have chapters, some don't
}

export interface ChapterMigrationResult {
  success: boolean;
  message: string;
  chapters_migrated: number;
  source_module_id: string;
  target_module_id: string;
  errors?: string[];
}

@Injectable()
export class DatabaseAuditService {
  private readonly logger = new Logger(DatabaseAuditService.name);

  constructor(
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
  ) {}

  /**
   * Audit all modules in a school's database
   * Identifies orphaned modules, duplicates, and modules without chapters
   */
  async auditSchoolModules(user: JWTUserPayload): Promise<ModuleAuditResult> {
    this.logger.log(`Starting module audit for school: ${user.school_id}`);

    // Get school
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new Error('School not found');
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);
    const ChapterModel = tenantConnection.model(Chapter.name, ChapterSchema);

    // Fetch all non-deleted modules
    const modules = await ModuleModel.find({ deleted_at: null })
      .select('_id title year created_at')
      .lean();

    this.logger.log(`Found ${modules.length} modules to audit`);

    // Count chapters for each module
    const modulesWithChapterCounts: ModuleWithChapterCount[] = [];
    
    for (const module of modules) {
      const chapterCount = await ChapterModel.countDocuments({
        module_id: module._id,
        deleted_at: null,
      });

      modulesWithChapterCounts.push({
        module_id: module._id.toString(),
        title: module.title,
        chapter_count: chapterCount,
        created_at: module.created_at || new Date(),
        year: module.year,
      });
    }

    // Identify orphaned modules (0 chapters)
    const orphanedModules = modulesWithChapterCounts.filter(
      (m) => m.chapter_count === 0,
    );

    // Identify duplicate module titles
    const titleGroups = new Map<string, ModuleWithChapterCount[]>();
    modulesWithChapterCounts.forEach((m) => {
      const normalizedTitle = m.title.toLowerCase().trim();
      if (!titleGroups.has(normalizedTitle)) {
        titleGroups.set(normalizedTitle, []);
      }
      titleGroups.get(normalizedTitle)!.push(m);
    });

    const duplicateModuleGroups: DuplicateModuleGroup[] = [];
    titleGroups.forEach((modules, title) => {
      if (modules.length > 1) {
        const hasChapters = modules.some((m) => m.chapter_count > 0);
        const hasNoChapters = modules.some((m) => m.chapter_count === 0);
        
        duplicateModuleGroups.push({
          title,
          modules: modules.sort((a, b) => b.chapter_count - a.chapter_count),
          total_duplicates: modules.length,
          has_chapters_conflict: hasChapters && hasNoChapters,
        });
      }
    });

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (orphanedModules.length > 0) {
      recommendations.push(
        `Found ${orphanedModules.length} modules with 0 chapters. Consider deleting or migrating data.`,
      );
    }

    if (duplicateModuleGroups.length > 0) {
      const conflictGroups = duplicateModuleGroups.filter(
        (g) => g.has_chapters_conflict,
      );
      if (conflictGroups.length > 0) {
        recommendations.push(
          `Found ${conflictGroups.length} duplicate module titles where some have chapters and some don't. Use the migration endpoint to consolidate.`,
        );
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Database is healthy! No issues detected.');
    }

    return {
      school_id: user.school_id?.toString() || '',
      school_name: school.name,
      total_modules: modules.length,
      modules_with_chapters: modulesWithChapterCounts.filter(
        (m) => m.chapter_count > 0,
      ).length,
      modules_without_chapters: orphanedModules.length,
      orphaned_modules: orphanedModules,
      duplicate_module_titles: duplicateModuleGroups,
      recommendations,
    };
  }

  /**
   * Migrate chapters from one module to another
   * Useful for consolidating duplicate modules
   */
  async migrateChapters(
    sourceModuleId: string,
    targetModuleId: string,
    user: JWTUserPayload,
    deleteSourceModule: boolean = false,
  ): Promise<ChapterMigrationResult> {
    this.logger.log(
      `Migrating chapters from ${sourceModuleId} to ${targetModuleId}`,
    );

    const errors: string[] = [];

    try {
      // Get school
      const school = await this.schoolModel.findById(user.school_id);
      if (!school) {
        throw new Error('School not found');
      }

      // Get tenant connection
      const tenantConnection =
        await this.tenantConnectionService.getTenantConnection(school.db_name);
      const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);
      const ChapterModel = tenantConnection.model(Chapter.name, ChapterSchema);

      // Validate both modules exist
      const [sourceModule, targetModule] = await Promise.all([
        ModuleModel.findById(new Types.ObjectId(sourceModuleId)),
        ModuleModel.findById(new Types.ObjectId(targetModuleId)),
      ]);

      if (!sourceModule) {
        throw new Error(`Source module ${sourceModuleId} not found`);
      }
      if (!targetModule) {
        throw new Error(`Target module ${targetModuleId} not found`);
      }

      // Find all chapters from source module
      const sourceChapters = await ChapterModel.find({
        module_id: new Types.ObjectId(sourceModuleId),
        deleted_at: null,
      });

      this.logger.log(`Found ${sourceChapters.length} chapters to migrate`);

      if (sourceChapters.length === 0) {
        return {
          success: true,
          message: 'No chapters to migrate (source module is empty)',
          chapters_migrated: 0,
          source_module_id: sourceModuleId,
          target_module_id: targetModuleId,
        };
      }

      // Update all chapters to point to target module
      const updateResult = await ChapterModel.updateMany(
        {
          module_id: new Types.ObjectId(sourceModuleId),
          deleted_at: null,
        },
        {
          $set: {
            module_id: new Types.ObjectId(targetModuleId),
            updated_at: new Date(),
          },
        },
      );

      this.logger.log(
        `Updated ${updateResult.modifiedCount} chapters to target module`,
      );

      // Optionally delete source module (soft delete)
      if (deleteSourceModule) {
        await ModuleModel.findByIdAndUpdate(new Types.ObjectId(sourceModuleId), {
          deleted_at: new Date(),
          updated_at: new Date(),
        });
        this.logger.log(`Soft-deleted source module ${sourceModuleId}`);
      }

      return {
        success: true,
        message: `Successfully migrated ${updateResult.modifiedCount} chapters from ${sourceModule.title} to ${targetModule.title}`,
        chapters_migrated: updateResult.modifiedCount,
        source_module_id: sourceModuleId,
        target_module_id: targetModuleId,
      };
    } catch (error) {
      this.logger.error(`Migration failed: ${error.message}`, error.stack);
      errors.push(error.message);

      return {
        success: false,
        message: `Migration failed: ${error.message}`,
        chapters_migrated: 0,
        source_module_id: sourceModuleId,
        target_module_id: targetModuleId,
        errors,
      };
    }
  }

  /**
   * Delete orphaned modules (modules with 0 chapters)
   * Soft delete by default
   */
  async deleteOrphanedModules(
    user: JWTUserPayload,
    hardDelete: boolean = false,
  ): Promise<{
    success: boolean;
    message: string;
    modules_deleted: number;
    deleted_module_ids: string[];
  }> {
    this.logger.log('Deleting orphaned modules (0 chapters)');

    // Get school
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new Error('School not found');
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);
    const ChapterModel = tenantConnection.model(Chapter.name, ChapterSchema);

    // Find all modules
    const modules = await ModuleModel.find({ deleted_at: null }).select('_id');

    // Filter modules with 0 chapters
    const orphanedModuleIds: string[] = [];
    for (const module of modules) {
      const chapterCount = await ChapterModel.countDocuments({
        module_id: module._id,
        deleted_at: null,
      });

      if (chapterCount === 0) {
        orphanedModuleIds.push(module._id.toString());
      }
    }

    if (orphanedModuleIds.length === 0) {
      return {
        success: true,
        message: 'No orphaned modules found',
        modules_deleted: 0,
        deleted_module_ids: [],
      };
    }

    // Delete modules
    if (hardDelete) {
      await ModuleModel.deleteMany({
        _id: { $in: orphanedModuleIds.map((id) => new Types.ObjectId(id)) },
      });
    } else {
      await ModuleModel.updateMany(
        { _id: { $in: orphanedModuleIds.map((id) => new Types.ObjectId(id)) } },
        {
          $set: {
            deleted_at: new Date(),
            updated_at: new Date(),
          },
        },
      );
    }

    this.logger.log(
      `Deleted ${orphanedModuleIds.length} orphaned modules (hard: ${hardDelete})`,
    );

    return {
      success: true,
      message: `Successfully ${hardDelete ? 'permanently deleted' : 'soft-deleted'} ${orphanedModuleIds.length} orphaned modules`,
      modules_deleted: orphanedModuleIds.length,
      deleted_module_ids: orphanedModuleIds,
    };
  }
}
