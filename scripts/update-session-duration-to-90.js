/**
 * Migration Script: Update Session Duration to 90 minutes
 * 
 * This script updates all existing internship cases to have a 90-minute
 * session duration instead of the old 60-minute default.
 * 
 * Usage:
 *   node scripts/update-session-duration-to-90.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { MongoClient } = require('mongodb');

async function updateSessionDurations() {
  try {
    console.log('🔄 Starting session duration update...\n');

    const baseUri = process.env.MONGODB_BASE_URI;
    
    if (!baseUri) {
      console.error('❌ MONGODB_BASE_URI not found in .env');
      process.exit(1);
    }

    // Connect to MongoDB
    const client = new MongoClient(baseUri);

    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    // Get central database
    const centralDb = client.db('central_database');
    const schoolsCollection = centralDb.collection('schools');
    
    const schools = await schoolsCollection.find({}).toArray();
    console.log(`📚 Found ${schools.length} school(s)\n`);

    let totalUpdated = 0;

    for (const school of schools) {
      console.log(`🏫 Processing: ${school.name} (${school.db_name})`);

      try {
        // Get tenant database
        const tenantDb = client.db(school.db_name);
        const casesCollection = tenantDb.collection('internshipcases');

        // Find cases with 60-minute duration or no session_config
        const casesToUpdate = await casesCollection.find({
          deleted_at: null,
          $or: [
            { 'session_config.session_duration_minutes': 60 },
            { 'session_config.session_duration_minutes': { $exists: false } },
            { session_config: { $exists: false } },
          ],
        }).toArray();

        console.log(`   Found ${casesToUpdate.length} case(s) to update`);

        if (casesToUpdate.length > 0) {
          // Update all cases to 90 minutes
          const result = await casesCollection.updateMany(
            {
              _id: { $in: casesToUpdate.map((c) => c._id) },
            },
            {
              $set: {
                'session_config.session_duration_minutes': 90,
                'session_config.max_sessions_allowed': null,
                'session_config.allow_pause': true,
                'session_config.auto_end_on_timeout': false,
                'session_config.warning_before_timeout_minutes': 5,
              },
            }
          );

          console.log(`   ✅ Updated ${result.modifiedCount} case(s) to 90 minutes`);
          totalUpdated += result.modifiedCount;

          // Show some examples
          if (casesToUpdate.length > 0) {
            console.log(`   📋 Sample updated cases:`);
            for (const c of casesToUpdate.slice(0, 3)) {
              console.log(`      - ${c.title} (ID: ${c._id})`);
            }
          }
        }
        console.log('');
      } catch (error) {
        console.error(`   ❌ Error processing school ${school.name}:`, error.message);
      }
    }

    console.log(`✅ Migration complete!`);
    console.log(`📊 Total cases updated: ${totalUpdated}`);
    console.log(`🎯 All IA Stage sessions now default to 90 minutes\n`);

    await client.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
updateSessionDurations();
