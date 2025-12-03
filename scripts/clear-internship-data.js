#!/usr/bin/env node

/**
 * Clear Internship Data Script
 * 
 * This script safely removes all internship-related data from the database
 * while keeping all other data (users, modules, quizzes, etc.) intact.
 * 
 * Collections to be cleared:
 * - internships
 * - internship_cases
 * - case_feedback_logs
 * - student_case_sessions
 * - student_internship_progress
 * - student_logbooks
 */

require('dotenv').config();
const mongoose = require('mongoose');

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.magenta}${msg}${colors.reset}\n`),
};

// Internship-related collections to clear
// Note: MongoDB collection names created by Mongoose are lowercase without underscores
const COLLECTIONS_TO_CLEAR = [
  'internships',
  'internshipcases',              // internship_cases becomes internshipcases
  'casefeedbacklogs',             // case_feedback_logs becomes casefeedbacklogs
  'studentcasesessions',          // student_case_sessions becomes studentcasesessions
  'student_internship_progress',  // This one keeps underscores (verify in DB)
  'studentinternshipprogress',    // Alternative without underscores
  'studentlogbooks',              // student_logbooks becomes studentlogbooks
];

async function getCentralConnection() {
  const mongoUri = process.env.CENTRAL_DB_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('CENTRAL_DB_URI or MONGODB_URI not found in environment variables');
  }
  
  log.info(`Connecting to central database...`);
  const connection = await mongoose.createConnection(mongoUri).asPromise();
  log.success('Connected to central database');
  return connection;
}

async function getTenantConnection(dbName) {
  const baseUri = process.env.MONGODB_BASE_URI;
  if (!baseUri) {
    throw new Error('MONGODB_BASE_URI not found in environment variables');
  }
  
  const connectionUrl = `${baseUri}/${dbName}`;
  log.info(`Connecting to tenant database: ${dbName}...`);
  const connection = await mongoose.createConnection(connectionUrl).asPromise();
  log.success(`Connected to tenant database: ${dbName}`);
  return connection;
}

async function getSchools(centralConnection) {
  const School = centralConnection.model('School', new mongoose.Schema({}, { strict: false }), 'schools');
  const schools = await School.find({ deleted_at: null }).select('name db_name').lean();
  return schools;
}

async function clearCollections(connection, dbName) {
  const results = {
    total: 0,
    details: [],
  };

  for (const collectionName of COLLECTIONS_TO_CLEAR) {
    try {
      // Check if collection exists
      const collections = await connection.db.listCollections({ name: collectionName }).toArray();
      
      if (collections.length === 0) {
        log.warning(`Collection '${collectionName}' does not exist in ${dbName} - skipping`);
        results.details.push({
          collection: collectionName,
          deleted: 0,
          status: 'not_found',
        });
        continue;
      }

      // Count documents before deletion
      const collection = connection.db.collection(collectionName);
      const countBefore = await collection.countDocuments();

      // Delete all documents
      const deleteResult = await collection.deleteMany({});

      results.total += deleteResult.deletedCount;
      results.details.push({
        collection: collectionName,
        deleted: deleteResult.deletedCount,
        status: 'success',
      });

      if (deleteResult.deletedCount > 0) {
        log.success(`Deleted ${deleteResult.deletedCount} documents from '${collectionName}'`);
      } else {
        log.info(`Collection '${collectionName}' was already empty`);
      }
    } catch (error) {
      log.error(`Error clearing collection '${collectionName}': ${error.message}`);
      results.details.push({
        collection: collectionName,
        deleted: 0,
        status: 'error',
        error: error.message,
      });
    }
  }

  return results;
}

async function confirmDeletion() {
  // Check if --yes flag is provided
  if (process.argv.includes('--yes') || process.argv.includes('-y')) {
    log.warning('Auto-confirmed via --yes flag');
    return true;
  }

  return new Promise((resolve) => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readline.question(
      `${colors.yellow}⚠ WARNING: This will delete all internship-related data!${colors.reset}\n` +
      `Collections to be cleared: ${COLLECTIONS_TO_CLEAR.join(', ')}\n\n` +
      `Are you sure you want to continue? (yes/no): `,
      (answer) => {
        readline.close();
        resolve(answer.toLowerCase() === 'yes');
      }
    );
  });
}

async function main() {
  log.header('🗑️  Internship Data Cleanup Script');

  try {
    // Get confirmation
    const confirmed = await confirmDeletion();
    if (!confirmed) {
      log.warning('Operation cancelled by user');
      process.exit(0);
    }

    console.log('');
    log.info('Starting cleanup process...');

    // Connect to central database
    const centralConnection = await getCentralConnection();

    // Get all schools (tenant databases)
    log.info('Fetching schools...');
    const schools = await getSchools(centralConnection);
    
    if (schools.length === 0) {
      log.warning('No schools found in the central database');
      await centralConnection.close();
      return;
    }

    log.success(`Found ${schools.length} school(s)`);

    // Clear internship data from each tenant database
    const allResults = [];

    for (const school of schools) {
      log.header(`📚 Processing: ${school.name} (${school.db_name})`);
      
      try {
        const tenantConnection = await getTenantConnection(school.db_name);
        const results = await clearCollections(tenantConnection, school.db_name);
        
        allResults.push({
          school: school.name,
          dbName: school.db_name,
          totalDeleted: results.total,
          details: results.details,
        });

        await tenantConnection.close();
        log.success(`Finished processing ${school.name}`);
      } catch (error) {
        log.error(`Failed to process ${school.name}: ${error.message}`);
        allResults.push({
          school: school.name,
          dbName: school.db_name,
          error: error.message,
        });
      }
    }

    // Close central connection
    await centralConnection.close();

    // Display summary
    log.header('📊 Summary');
    
    let totalDeletedAcrossAll = 0;
    
    for (const result of allResults) {
      console.log(`\n${colors.cyan}${result.school}${colors.reset} (${result.dbName}):`);
      
      if (result.error) {
        log.error(`  Error: ${result.error}`);
        continue;
      }

      if (result.totalDeleted === 0) {
        log.info('  No documents deleted (collections were empty)');
      } else {
        log.success(`  Total deleted: ${result.totalDeleted} documents`);
        totalDeletedAcrossAll += result.totalDeleted;
      }

      // Show details per collection
      for (const detail of result.details) {
        if (detail.status === 'success' && detail.deleted > 0) {
          console.log(`    • ${detail.collection}: ${detail.deleted} documents`);
        } else if (detail.status === 'error') {
          console.log(`    • ${detail.collection}: ${colors.red}ERROR${colors.reset} - ${detail.error}`);
        }
      }
    }

    console.log('');
    log.header(`✨ Cleanup Complete!`);
    log.success(`Total documents deleted across all schools: ${totalDeletedAcrossAll}`);
    log.info('All other data (users, modules, quizzes, etc.) remains intact');

  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
main()
  .then(() => {
    console.log('');
    process.exit(0);
  })
  .catch((error) => {
    log.error(`Unhandled error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });

