#!/usr/bin/env node

import { config } from 'dotenv';
import { MigrationService } from './migration.service';
import { Logger } from '@nestjs/common';

// Load environment variables
config();

class MigrationCLI {
  private readonly logger = new Logger('MigrationCLI');
  private readonly migrationService = new MigrationService();

  /**
   * Parse command line arguments
   */
  private parseArguments(): { dbName?: string, type?: string, help?: boolean } {
    const args = process.argv.slice(2);
    const parsed: { dbName?: string, type?: string, help?: boolean } = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--db-name':
          if (i + 1 < args.length) {
            parsed.dbName = args[i + 1];
            i++;
          } else {
            throw new Error('--db-name requires a value');
          }
          break;
        
        case '--type':
          if (i + 1 < args.length) {
            const type = args[i + 1];
            if (!['central', 'tenant', 'all'].includes(type)) {
              throw new Error('--type must be one of: central, tenant, all');
            }
            parsed.type = type;
            i++;
          } else {
            throw new Error('--type requires a value');
          }
          break;
        
        case '--help':
        case '-h':
          parsed.help = true;
          break;
        
        default:
          if (arg.startsWith('--')) {
            throw new Error(`Unknown argument: ${arg}`);
          }
      }
    }

    return parsed;
  }

  /**
   * Display help information
   */
  private showHelp(): void {
    console.log(`
🚀 AI Professor Migration Tool

USAGE:
  yarn migrate [OPTIONS]

OPTIONS:
  --type <type>        Type of migration to run (central|tenant|all) [default: all]
  --db-name <name>     Tenant database name (required for tenant migrations)
  --help, -h           Show this help message

EXAMPLES:
  # Run only central migrations
  yarn migrate --type central

  # Run only tenant migrations for a specific database
  yarn migrate --type tenant --db-name school_abc_db

  # Run all migrations (central + tenant) for a specific database
  yarn migrate --db-name school_abc_db

  # Run all migrations (central + tenant) - same as above
  yarn migrate --type all --db-name school_abc_db

ENVIRONMENT VARIABLES:
  MONGODB_URI          Central database connection string
  CENTRAL_DB_URI       Alternative central database connection string
  MONGODB_BASE_URI     Base URI for tenant databases (without database name)

NOTES:
  - Central migrations run first, then tenant migrations
  - If central migrations fail, tenant migrations will be skipped
  - Migrations are tracked to avoid re-running
  - Migration files should be named: YYYYMMDDHHMMSS-description.migration.ts
  - Example files are ignored (files starting with 'example')
`);
  }

  /**
   * Validate arguments
   */
  private validateArguments(args: { dbName?: string, type?: string }): void {
    const { dbName, type } = args;

    // If type is tenant, db-name is required
    if (type === 'tenant' && !dbName) {
      throw new Error('--db-name is required when --type is tenant');
    }

    // If type is all and we want to run tenant migrations, db-name is required
    if ((type === 'all' || !type) && !dbName) {
      this.logger.warn('⚠️ No --db-name provided. Only central migrations will be run.');
    }

    // Validate required environment variables
    const centralUri = process.env.MONGODB_URI || process.env.CENTRAL_DB_URI;
    if (!centralUri) {
      throw new Error('MONGODB_URI or CENTRAL_DB_URI environment variable is required');
    }

    if ((type === 'tenant' || dbName) && !process.env.MONGODB_BASE_URI) {
      throw new Error('MONGODB_BASE_URI environment variable is required for tenant migrations');
    }
  }

  /**
   * Format and display migration results
   */
  private displayResults(results: { central: any[], tenant?: any[] }): void {
    let totalExecuted = 0;
    let totalFailed = 0;

    this.logger.log('\n📊 Migration Results Summary:');
    this.logger.log('═'.repeat(50));

    // Central results
    if (results.central.length > 0) {
      this.logger.log('\n🏛️ Central Database:');
      results.central.forEach(result => {
        const status = result.success ? '✅' : '❌';
        const time = `${result.execution_time_ms}ms`;
        this.logger.log(`  ${status} ${result.migration_name} (${time})`);
        
        if (!result.success && result.error) {
          this.logger.error(`     Error: ${result.error}`);
        }
      });
      
      const centralFailed = results.central.filter(r => !r.success).length;
      totalExecuted += results.central.length;
      totalFailed += centralFailed;
    }

    // Tenant results
    if (results.tenant && results.tenant.length > 0) {
      this.logger.log('\n🏢 Tenant Database:');
      results.tenant.forEach(result => {
        const status = result.success ? '✅' : '❌';
        const time = `${result.execution_time_ms}ms`;
        this.logger.log(`  ${status} ${result.migration_name} (${time})`);
        
        if (!result.success && result.error) {
          this.logger.error(`     Error: ${result.error}`);
        }
      });
      
      const tenantFailed = results.tenant.filter(r => !r.success).length;
      totalExecuted += results.tenant.length;
      totalFailed += tenantFailed;
    }

    // Summary
    // this.logger.log('\n═'.repeat(50));
    this.logger.log(`📈 Total: ${totalExecuted} migrations executed`);
    this.logger.log(`✅ Success: ${totalExecuted - totalFailed}`);
    this.logger.log(`❌ Failed: ${totalFailed}`);
    
    if (totalExecuted === 0) {
      this.logger.log('🎉 No new migrations to run - all up to date!');
    } else if (totalFailed === 0) {
      this.logger.log('🎉 All migrations completed successfully!');
    } else {
      this.logger.error('⚠️ Some migrations failed. Please check the errors above.');
    }
  }

  /**
   * Run migrations based on CLI arguments
   */
  async run(): Promise<void> {
    try {
      const args = this.parseArguments();

      // Show help if requested
      if (args.help) {
        this.showHelp();
        process.exit(0);
      }

      // Validate arguments
      this.validateArguments(args);

      const { dbName, type = 'all' } = args;

      this.logger.log('🚀 Starting AI Professor Database Migrations...');
      this.logger.log(`Migration Type: ${type}`);
      if (dbName) {
        this.logger.log(`Tenant Database: ${dbName}`);
      }
      this.logger.log('═'.repeat(50));

      let results: { central: any[], tenant?: any[] };

      // Execute migrations based on type
      switch (type) {
        case 'central':
          results = {
            central: await this.migrationService.runCentralMigrations(),
          };
          break;

        case 'tenant':
          if (!dbName) {
            throw new Error('Tenant database name is required for tenant migrations');
          }
          results = {
            central: [],
            tenant: await this.migrationService.runTenantMigrations(dbName),
          };
          break;

        case 'all':
        default:
          results = await this.migrationService.runAllMigrations(dbName);
          break;
      }

      // Display results
      this.displayResults(results);

      // Exit with appropriate code
      const hasFailures = results.central.some(r => !r.success) || 
                         (results.tenant && results.tenant.some(r => !r.success));
      
      process.exit(hasFailures ? 1 : 0);

    } catch (error) {
      this.logger.error('💥 Migration CLI Error:', error instanceof Error ? error.message : String(error));
      
      if (error instanceof Error && error.message.includes('Unknown argument')) {
        this.logger.log('\nUse --help for usage information.');
      }
      
      process.exit(1);
    }
  }
}

// Execute CLI if this file is run directly
if (require.main === module) {
  const cli = new MigrationCLI();
  cli.run();
}

export { MigrationCLI }; 