/**
 * Script to manually recalculate progress for all students
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { MongoClient, ObjectId } = require('mongodb');

async function recalculateProgress() {
  const baseUri = process.env.MONGODB_BASE_URI;

  if (!baseUri) {
    console.error('❌ MONGODB_BASE_URI not found in .env');
    process.exit(1);
  }

  console.log('🔄 Recalculating progress for all students...\n');

  const client = new MongoClient(baseUri);

  try {
    await client.connect();

    const centralDb = client.db('central_database');
    const schools = await centralDb.collection('schools').find({}).toArray();

    console.log(`📚 Found ${schools.length} school(s)\n`);

    for (const school of schools) {
      console.log(`🏫 Processing: ${school.name} (${school.db_name})`);

      const tenantDb = client.db(school.db_name);
      const progressCollection = tenantDb.collection('student_internship_progress');
      const casesCollection = tenantDb.collection('internshipcases');
      const sessionsCollection = tenantDb.collection('studentcasesessions');
      const feedbackCollection = tenantDb.collection('casefeedbacklogs');

      const progressRecords = await progressCollection.find({}).toArray();

      console.log(`   Found ${progressRecords.length} progress records`);

      for (const progress of progressRecords) {
        // Count total cases for internship
        const totalCases = await casesCollection.countDocuments({
          internship_id: progress.internship_id,
          deleted_at: null,
        });

        // Count completed cases with validated feedback
        const validatedFeedback = await feedbackCollection
          .find({
            student_id: progress.student_id,
            status: { $in: ['VALIDATED', 'REVISED'] },
          })
          .toArray();

        const validatedCaseIds = validatedFeedback.map((f) => f.case_id);

        // Count cases with completed sessions (new logic)
        const completedSessions = await sessionsCollection
          .find({
            student_id: progress.student_id,
            status: { $in: ['COMPLETED', 'PENDING_VALIDATION'] },
            deleted_at: null,
          })
          .toArray();

        const sessionCaseIds = completedSessions.map((s) => s.case_id);

        // Merge unique case IDs
        const allCaseIds = [
          ...new Set([
            ...validatedCaseIds.map((id) => id.toString()),
            ...sessionCaseIds.map((id) => id.toString()),
          ]),
        ].map((id) => new ObjectId(id));

        // Filter to cases in this internship
        const completedCasesCount = await casesCollection.countDocuments({
          _id: { $in: allCaseIds },
          internship_id: progress.internship_id,
          deleted_at: null,
        });

        // Calculate new progress
        const newProgress =
          totalCases > 0 ? Math.round((completedCasesCount / totalCases) * 100) : 0;

        // Determine status
        let status = 'IN_PROGRESS';
        if (newProgress === 0) {
          status = 'NOT_STARTED';
        } else if (newProgress === 100) {
          status = 'COMPLETED';
        }

        // Update progress record
        await progressCollection.updateOne(
          { _id: progress._id },
          {
            $set: {
              progress_percentage: newProgress,
              cases_completed: completedCasesCount,
              total_cases: totalCases,
              status: status,
              last_accessed_at: new Date(),
              updated_at: new Date(),
            },
          }
        );

        console.log(
          `   Student ${progress.student_id}: ${progress.progress_percentage}% → ${newProgress}% (${completedCasesCount}/${totalCases} cases)`
        );
      }

      console.log('');
    }

    console.log(`✅ Progress recalculation complete!\n`);

    await client.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
recalculateProgress();
