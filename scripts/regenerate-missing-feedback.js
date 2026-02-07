/**
 * Script to regenerate feedback for completed sessions that don't have feedback
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { MongoClient, ObjectId } = require('mongodb');
const axios = require('axios');

async function regenerateMissingFeedback() {
  const baseUri = process.env.MONGODB_BASE_URI;
  const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:8000/api/v1';

  if (!baseUri) {
    console.error('❌ MONGODB_BASE_URI not found in .env');
    process.exit(1);
  }

  console.log('🔄 Starting feedback regeneration...\n');

  const client = new MongoClient(baseUri);

  try {
    await client.connect();

    // Get central database
    const centralDb = client.db('central_database');
    const schools = await centralDb.collection('schools').find({}).toArray();

    console.log(`📚 Found ${schools.length} school(s)\n`);

    let totalRegenerated = 0;
    let totalFailed = 0;

    for (const school of schools) {
      console.log(`🏫 Processing: ${school.name} (${school.db_name})`);

      const tenantDb = client.db(school.db_name);
      const sessionsCollection = tenantDb.collection('studentcasesessions');
      const feedbackCollection = tenantDb.collection('casefeedbacklogs');
      const casesCollection = tenantDb.collection('internshipcases');

      // Find completed sessions without feedback
      const completedSessions = await sessionsCollection
        .find({ status: 'COMPLETED', deleted_at: null })
        .toArray();

      console.log(`   Found ${completedSessions.length} COMPLETED sessions`);

      if (completedSessions.length === 0) {
        console.log('   ✅ No sessions need feedback regeneration\n');
        continue;
      }

      // Check which sessions don't have feedback
      const allFeedback = await feedbackCollection.find({}).toArray();
      const feedbackSessionIds = new Set(
        allFeedback.map((f) => f.session_id.toString())
      );

      const sessionsWithoutFeedback = completedSessions.filter(
        (s) => !feedbackSessionIds.has(s._id.toString())
      );

      console.log(
        `   ${sessionsWithoutFeedback.length} sessions need feedback regeneration`
      );

      for (const session of sessionsWithoutFeedback) {
        try {
          console.log(`   🔄 Generating feedback for session ${session._id}...`);

          // Get case details
          const caseData = await casesCollection.findOne({
            _id: session.case_id,
            deleted_at: null,
          });

          if (!caseData) {
            console.log(`   ⚠️  Case not found for session ${session._id}`);
            totalFailed++;
            continue;
          }

          // Calculate session duration
          const sessionStartTime = session.started_at || session.created_at;
          const sessionEndTime = session.ended_at || new Date();
          const durationMs =
            new Date(sessionEndTime).getTime() -
            new Date(sessionStartTime).getTime();
          const sessionDurationMinutes = Math.floor(durationMs / 60000);

          // Generate feedback via Python API
          const payload = {
            case_id: session.case_id.toString(),
            session_data: {
              messages: session.messages || [],
              session_type: session.session_type,
              started_at: session.started_at,
              ended_at: session.ended_at,
              session_duration_minutes: sessionDurationMinutes,
            },
            evaluation_criteria: caseData.evaluation_criteria || [],
          };

          let pythonResponse;
          try {
            const response = await axios.post(
              `${pythonApiUrl}/internship/supervisor/feedback`,
              payload,
              {
                timeout: 60000,
                headers: { 'Content-Type': 'application/json' },
              }
            );
            pythonResponse = response.data;
          } catch (pythonError) {
            console.log(
              `   ⚠️  Python API failed for session ${session._id}:`,
              pythonError.response?.data?.message || pythonError.message
            );
            totalFailed++;
            continue;
          }

          // Create feedback document
          const feedbackData = {
            student_id: session.student_id,
            case_id: session.case_id,
            session_id: session._id,
            feedback_type: 'AUTO_GENERATED',
            ai_feedback: {
              overall_score: pythonResponse.feedback?.overall_score || 0,
              strengths: pythonResponse.feedback?.strengths || [],
              areas_for_improvement:
                pythonResponse.feedback?.areas_for_improvement || [],
              technical_assessment:
                pythonResponse.feedback?.technical_assessment || {},
              communication_assessment:
                pythonResponse.feedback?.communication_assessment || {},
              clinical_reasoning:
                pythonResponse.feedback?.clinical_reasoning || {},
              generated_at: new Date(),
            },
            professor_feedback: {},
            status: 'PENDING_VALIDATION',
            created_at: new Date(),
            updated_at: new Date(),
          };

          await feedbackCollection.insertOne(feedbackData);

          // Update session status to PENDING_VALIDATION
          await sessionsCollection.updateOne(
            { _id: session._id },
            { $set: { status: 'PENDING_VALIDATION', updated_at: new Date() } }
          );

          console.log(`   ✅ Feedback generated for session ${session._id}`);
          totalRegenerated++;
        } catch (error) {
          console.log(
            `   ❌ Error processing session ${session._id}:`,
            error.message
          );
          totalFailed++;
        }
      }

      console.log('');
    }

    console.log(`✅ Regeneration complete!`);
    console.log(`📊 Summary:`);
    console.log(`   - Total feedback regenerated: ${totalRegenerated}`);
    console.log(`   - Total failed: ${totalFailed}`);
    console.log(
      `\n💡 Next step: Have professors validate the feedback to update progress\n`
    );

    await client.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
regenerateMissingFeedback();
