/**
 * Migration Script: Update existing InternshipCase documents to new format
 * 
 * This script migrates all existing cases to the new 3-step assessment system:
 * - Sets step=1 (default for existing cases)
 * - Sets case_type='isolated'
 * - Sets patient_base_id=null (Step 1 cases are isolated)
 * - Sets sequence_in_step = sequence
 * - Sets pass_threshold=70 (default)
 * - Converts evaluation_criteria to assessment_criteria format (if possible)
 * - Initializes empty arrays for new fields
 * 
 * Run with: node scripts/migrate-cases-to-new-format.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// MongoDB connection - use CENTRAL_DB_URI which includes database name
const MONGODB_URI = process.env.CENTRAL_DB_URI || 'mongodb://localhost:27017/central_database';

async function migrateCases() {
    try {
      console.log('🚀 Starting migration of InternshipCase documents...\n');

      // Connect to MongoDB (URI already includes database name)
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Connected to MongoDB\n');

    // Get central database
    const centralDb = mongoose.connection.db;

    // Get all schools (to access tenant databases)
    const schoolsCollection = centralDb.collection('schools');
    const schools = await schoolsCollection.find({ deleted_at: null }).toArray();
    
    console.log(`📊 Found ${schools.length} schools to process\n`);

    let totalCasesUpdated = 0;
    let totalErrors = 0;

    // Process each school's tenant database
    for (const school of schools) {
      try {
        console.log(`\n📦 Processing school: ${school.name} (${school.db_name})`);

        // Connect to tenant database
        const tenantDb = mongoose.connection.useDb(school.db_name);
        
        // FIXED: Collection name is 'internshipcases' (no underscore)
        const casesCollection = tenantDb.collection('internshipcases');

        // Get all cases (including soft-deleted ones - we'll migrate everything)
        const cases = await casesCollection.find({}).toArray();
        console.log(`   Found ${cases.length} cases`);

        if (cases.length === 0) {
          console.log('   ⏭️  Skipping (no cases to migrate)');
          continue;
        }

        // Migrate each case
        for (const caseDoc of cases) {
          try {
            const updates = {};

            // 1. Set step=1 (default for existing cases)
            if (!caseDoc.step) {
              updates.step = 1;
            }

            // 2. Set case_type='isolated' (Step 1)
            if (!caseDoc.case_type) {
              updates.case_type = 'isolated';
            }

            // 3. Set patient_base_id=null (Step 1 cases)
            if (caseDoc.patient_base_id === undefined) {
              updates.patient_base_id = null;
            }

            // 4. Set sequence_in_step = sequence
            if (!caseDoc.sequence_in_step) {
              updates.sequence_in_step = caseDoc.sequence || 1;
            }

            // 5. Set emdr_phase_focus=null (not applicable for Step 1)
            if (caseDoc.emdr_phase_focus === undefined) {
              updates.emdr_phase_focus = null;
            }

            // 6. Set session_narrative=null (not applicable for Step 1)
            if (caseDoc.session_narrative === undefined) {
              updates.session_narrative = null;
            }

            // 7. Set pass_threshold=70 (default)
            if (!caseDoc.pass_threshold) {
              updates.pass_threshold = 70;
            }

            // 8. Initialize assessment_criteria from evaluation_criteria (if exists)
            if (!caseDoc.assessment_criteria || caseDoc.assessment_criteria.length === 0) {
              if (caseDoc.evaluation_criteria && caseDoc.evaluation_criteria.length > 0) {
                // Convert old format to new format
                updates.assessment_criteria = caseDoc.evaluation_criteria.map((criterion, index) => ({
                  criterion_id: criterion.criterion.toLowerCase().replace(/\s+/g, '_'),
                  name: criterion.criterion,
                  description: `Évaluation de ${criterion.criterion.toLowerCase()}`,
                  max_points: criterion.weight,
                  reference_literature: null,
                  ko_example: null,
                  ok_example: null,
                }));
              } else {
                // No criteria - create default empty array
                updates.assessment_criteria = [];
              }
            }

            // 9. Initialize literature_references (empty)
            if (!caseDoc.literature_references) {
              updates.literature_references = [];
            }

            // 10. Initialize patient_state=null (not applicable for Step 1)
            if (caseDoc.patient_state === undefined) {
              updates.patient_state = null;
            }

            // Apply updates if any
            if (Object.keys(updates).length > 0) {
              await casesCollection.updateOne(
                { _id: caseDoc._id },
                { $set: updates }
              );
              totalCasesUpdated++;
              console.log(`   ✅ Migrated: ${caseDoc.title}`);
            } else {
              console.log(`   ⏭️  Already migrated: ${caseDoc.title}`);
            }
          } catch (error) {
            console.error(`   ❌ Error migrating case ${caseDoc.title}:`, error.message);
            totalErrors++;
          }
        }

        console.log(`   ✅ Completed school: ${school.name} (${cases.length} cases processed)`);
      } catch (error) {
        console.error(`❌ Error processing school ${school.name}:`, error.message);
        totalErrors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Total cases updated: ${totalCasesUpdated}`);
    console.log(`❌ Total errors: ${totalErrors}`);
    console.log(`🏫 Total schools processed: ${schools.length}`);
    console.log('='.repeat(60) + '\n');

    console.log('✅ Migration completed successfully!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run migration
if (require.main === module) {
  migrateCases()
    .then(() => {
      console.log('\n✨ All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { migrateCases };
