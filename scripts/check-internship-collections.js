#!/usr/bin/env node

/**
 * Check Internship Collections Script
 * 
 * This script checks what collections exist and counts documents
 */

require('dotenv').config();
const mongoose = require('mongoose');

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

async function getCentralConnection() {
  const mongoUri = process.env.CENTRAL_DB_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('CENTRAL_DB_URI or MONGODB_URI not found in environment variables');
  }
  
  const connection = await mongoose.createConnection(mongoUri).asPromise();
  return connection;
}

async function getTenantConnection(dbName) {
  const baseUri = process.env.MONGODB_BASE_URI;
  if (!baseUri) {
    throw new Error('MONGODB_BASE_URI not found in environment variables');
  }
  
  const connectionUrl = `${baseUri}/${dbName}`;
  const connection = await mongoose.createConnection(connectionUrl).asPromise();
  return connection;
}

async function getSchools(centralConnection) {
  const School = centralConnection.model('School', new mongoose.Schema({}, { strict: false }), 'schools');
  const schools = await School.find({ deleted_at: null }).select('name db_name').lean();
  return schools;
}

async function checkCollections(connection, dbName) {
  log.info('Listing all collections...');
  
  const collections = await connection.db.listCollections().toArray();
  
  console.log(`\nFound ${collections.length} collections in ${dbName}:`);
  
  // Filter internship-related collections
  const internshipCollections = collections.filter(col => 
    col.name.includes('internship') || 
    col.name.includes('case') || 
    col.name.includes('feedback') || 
    col.name.includes('session') ||
    col.name.includes('logbook')
  );

  if (internshipCollections.length === 0) {
    log.success('No internship-related collections found');
    return;
  }

  log.warning(`Found ${internshipCollections.length} internship-related collections:`);
  
  for (const col of internshipCollections) {
    const collection = connection.db.collection(col.name);
    const count = await collection.countDocuments();
    
    if (count > 0) {
      console.log(`  ${colors.yellow}●${colors.reset} ${col.name}: ${colors.red}${count} documents${colors.reset}`);
    } else {
      console.log(`  ${colors.green}○${colors.reset} ${col.name}: ${colors.green}empty${colors.reset}`);
    }
  }
}

async function main() {
  log.header('🔍 Checking Internship Collections');

  try {
    const centralConnection = await getCentralConnection();
    const schools = await getSchools(centralConnection);
    
    for (const school of schools) {
      log.header(`📚 ${school.name} (${school.db_name})`);
      
      const tenantConnection = await getTenantConnection(school.db_name);
      await checkCollections(tenantConnection, school.db_name);
      await tenantConnection.close();
    }

    await centralConnection.close();
    log.header('✨ Check Complete!');

  } catch (error) {
    log.error(`Error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

