import { Injectable, Logger } from '@nestjs/common';
import * as mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { MigrationTracker, MigrationTrackerSchema } from './schemas/migration-tracker.schema';

export interface MigrationFile {
  name: string;
  path: string;
  timestamp: number;
}

export interface MigrationResult {
  success: boolean;
  migration_name: string;
  execution_time_ms: number;
  error?: string;
}

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  /**
   * Get central database connection
   */
  private async getCentralConnection(): Promise<mongoose.Connection> {
    const mongoUri = process.env.MONGODB_URI || process.env.CENTRAL_DB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI or CENTRAL_DB_URI is not defined in environment variables');
    }

    this.logger.log(`Connecting to central database: ${mongoUri}`);
    const connection = await mongoose.createConnection(mongoUri);
    
    connection.on('connected', () => {
      this.logger.log('✅ Central database connected successfully');
    });

    connection.on('error', (error) => {
      this.logger.error('❌ Central database connection error:', error.message);
    });

    return connection;
  }

  /**
   * Get tenant database connection
   */
  private async getTenantConnection(dbName: string): Promise<mongoose.Connection> {
    const baseUri = process.env.MONGODB_BASE_URI;
    if (!baseUri) {
      throw new Error('MONGODB_BASE_URI is not defined in environment variables');
    }

    const connectionUrl = `${baseUri}/${dbName}`;
    this.logger.log(`Connecting to tenant database: ${connectionUrl}`);
    
    const connection = await mongoose.createConnection(connectionUrl);
    
    connection.on('connected', () => {
      this.logger.log(`✅ Tenant database ${dbName} connected successfully`);
    });

    connection.on('error', (error) => {
      this.logger.error(`❌ Tenant database ${dbName} connection error:`, error.message);
    });

    return connection;
  }

  /**
   * Get migration files from a directory
   */
  private getMigrationFiles(migrationDir: string): MigrationFile[] {
    if (!fs.existsSync(migrationDir)) {
      this.logger.warn(`Migration directory does not exist: ${migrationDir}`);
      return [];
    }

    const files = fs.readdirSync(migrationDir)
      .filter(file => file.endsWith('.migration.ts') || file.endsWith('.migration.js'))
      .filter(file => !file.startsWith('example'))
      .map(file => {
        const filePath = path.join(migrationDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file.replace(/\.(migration\.(ts|js))$/, ''),
          path: filePath,
          timestamp: stats.birthtime.getTime(),
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    return files;
  }

  /**
   * Check if migration has already been executed
   */
  private async isMigrationExecuted(
    connection: mongoose.Connection,
    migrationName: string,
    migrationType: 'central' | 'tenant',
    tenantDbName?: string
  ): Promise<boolean> {
    const MigrationModel = connection.model('MigrationTracker', MigrationTrackerSchema);
    
    const query: any = {
      migration_name: migrationName,
      migration_type: migrationType,
      success: true,
    };

    if (migrationType === 'tenant' && tenantDbName) {
      query.tenant_db_name = tenantDbName;
    }

    const existingMigration = await MigrationModel.findOne(query);
    return !!existingMigration;
  }

  /**
   * Record migration execution
   */
  private async recordMigration(
    connection: mongoose.Connection,
    migrationName: string,
    migrationType: 'central' | 'tenant',
    executionTimeMs: number,
    success: boolean,
    errorMessage?: string,
    tenantDbName?: string
  ): Promise<void> {
    const MigrationModel = connection.model('MigrationTracker', MigrationTrackerSchema);
    
    await MigrationModel.create({
      migration_name: migrationName,
      migration_type: migrationType,
      tenant_db_name: tenantDbName,
      execution_time_ms: executionTimeMs,
      success,
      error_message: errorMessage,
    });
  }

  /**
   * Execute a single migration file
   */
  private async executeMigration(
    migrationFile: MigrationFile,
    connection: mongoose.Connection,
    migrationType: 'central' | 'tenant',
    tenantDbName?: string
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`📦 Executing migration: ${migrationFile.name}`);
      
      // Import the migration file
      const migrationModule = await import(migrationFile.path);
      
      if (!migrationModule.up || typeof migrationModule.up !== 'function') {
        throw new Error(`Migration file ${migrationFile.name} does not export an 'up' function`);
      }

      // Execute the migration
      if (migrationType === 'tenant' && tenantDbName) {
        await migrationModule.up(connection, tenantDbName);
      } else {
        await migrationModule.up(connection);
      }

      const executionTime = Date.now() - startTime;
      
      // Record successful migration
      await this.recordMigration(
        connection,
        migrationFile.name,
        migrationType,
        executionTime,
        true,
        undefined,
        tenantDbName
      );

      this.logger.log(`✅ Migration ${migrationFile.name} completed in ${executionTime}ms`);
      
      return {
        success: true,
        migration_name: migrationFile.name,
        execution_time_ms: executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Record failed migration
      await this.recordMigration(
        connection,
        migrationFile.name,
        migrationType,
        executionTime,
        false,
        errorMessage,
        tenantDbName
      );

      this.logger.error(`❌ Migration ${migrationFile.name} failed: ${errorMessage}`);
      
      return {
        success: false,
        migration_name: migrationFile.name,
        execution_time_ms: executionTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Run central database migrations
   */
  async runCentralMigrations(): Promise<MigrationResult[]> {
    this.logger.log('🚀 Starting central database migrations...');
    
    const connection = await this.getCentralConnection();
    const migrationDir = path.join(process.cwd(), 'src', 'database', 'migrations', 'central');
    const migrationFiles = this.getMigrationFiles(migrationDir);
    
    this.logger.log(`Found ${migrationFiles.length} central migration files`);
    
    const results: MigrationResult[] = [];
    
    try {
      for (const migrationFile of migrationFiles) {
        // Check if migration has already been executed
        const isExecuted = await this.isMigrationExecuted(
          connection,
          migrationFile.name,
          'central'
        );
        
        if (isExecuted) {
          this.logger.log(`⏭️ Skipping already executed migration: ${migrationFile.name}`);
          continue;
        }
        
        const result = await this.executeMigration(
          migrationFile,
          connection,
          'central'
        );
        
        results.push(result);
        
        // Stop on first failure
        if (!result.success) {
          this.logger.error('🛑 Stopping migration due to failure');
          break;
        }
      }
    } finally {
      await connection.close();
    }
    
    this.logger.log(`🏁 Central migrations completed. ${results.length} migrations processed.`);
    return results;
  }

  /**
   * Run tenant database migrations
   */
  async runTenantMigrations(tenantDbName: string): Promise<MigrationResult[]> {
    this.logger.log(`🚀 Starting tenant database migrations for: ${tenantDbName}`);
    
    const connection = await this.getTenantConnection(tenantDbName);
    const migrationDir = path.join(process.cwd(), 'src', 'database', 'migrations', 'tenants');
    const migrationFiles = this.getMigrationFiles(migrationDir);
    
    this.logger.log(`Found ${migrationFiles.length} tenant migration files`);
    
    const results: MigrationResult[] = [];
    
    try {
      for (const migrationFile of migrationFiles) {
        // Check if migration has already been executed
        const isExecuted = await this.isMigrationExecuted(
          connection,
          migrationFile.name,
          'tenant',
          tenantDbName
        );
        
        if (isExecuted) {
          this.logger.log(`⏭️ Skipping already executed migration: ${migrationFile.name}`);
          continue;
        }
        
        const result = await this.executeMigration(
          migrationFile,
          connection,
          'tenant',
          tenantDbName
        );
        
        results.push(result);
        
        // Stop on first failure
        if (!result.success) {
          this.logger.error('🛑 Stopping migration due to failure');
          break;
        }
      }
    } finally {
      await connection.close();
    }
    
    this.logger.log(`🏁 Tenant migrations for ${tenantDbName} completed. ${results.length} migrations processed.`);
    return results;
  }

  /**
   * Run all migrations (central + specific tenant)
   */
  async runAllMigrations(tenantDbName?: string): Promise<{ central: MigrationResult[], tenant?: MigrationResult[] }> {
    const results: { central: MigrationResult[], tenant?: MigrationResult[] } = {
      central: [],
    };
    
    // Run central migrations first
    results.central = await this.runCentralMigrations();
    
    // Check if central migrations were successful
    const centralFailures = results.central.filter(r => !r.success);
    if (centralFailures.length > 0) {
      this.logger.error('🛑 Skipping tenant migrations due to central migration failures');
      return results;
    }
    
    // Run tenant migrations if db name is provided
    if (tenantDbName) {
      results.tenant = await this.runTenantMigrations(tenantDbName);
    }
    
    return results;
  }
} 