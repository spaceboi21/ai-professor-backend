const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { MongoClient, ObjectId } = require('mongodb');
const axios = require('axios');

async function generateMissingFeedbacks() {
  const baseUri = process.env.MONGODB_BASE_URI;
  const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:8000/api/v1';
  
  if (!baseUri) {
    console.error('❌ MONGODB_BASE_URI not found in .env');
    process.exit(1);
  }
  
  console.log('🔍 Generating missing feedbacks...\n');
  
  const client = new MongoClient(baseUri);
  
  try {
    await client.connect();
    
    const tenantDb = client.db('demo_school');
    const sessionsCollection = tenantDb.collection('studentcasesessions');
    const feedbacksCollection = tenantDb.collection('casefeedbacklogs');
    const casesCollection = tenantDb.collection('internshipcases');
    
    // Find completed sessions without feedback
    const completedSessions = await sessionsCollection.find({ status: 'COMPLETED' }).toArray();
    
    console.log(`Found ${completedSessions.length} completed sessions\n`);
    
    for (const session of completedSessions) {
      // Check if feedback already exists
      const existingFeedback = await feedbacksCollection.findOne({ session_id: session._id });
      
      if (existingFeedback) {
        console.log(`✅ Session ${session._id} already has feedback`);
        continue;
      }
      
      console.log(`\n📝 Generating feedback for session: ${session._id}`);
      console.log(`   Type: ${session.session_type}`);
      console.log(`   Messages: ${session.messages?.length || 0}`);
      
      // Get case details
      const caseData = await casesCollection.findOne({ _id: session.case_id });
      
      if (!caseData) {
        console.log(`   ❌ Case not found for session ${session._id}`);
        continue;
      }
      
      try {
        // Calculate session duration
        const sessionStartTime = session.started_at || session.created_at;
        const sessionEndTime = session.ended_at || new Date();
        const durationMs = new Date(sessionEndTime) - new Date(sessionStartTime);
        const sessionDurationMinutes = Math.floor(durationMs / 60000);
        
        // Call Python API to generate feedback
        console.log(`   🤖 Calling Python API to generate feedback...`);
        
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
        
        const response = await axios.post(
          `${pythonApiUrl}/internship/supervisor/generate-feedback`,
          payload,
          { timeout: 60000 }
        );
        
        const pythonResponse = response.data;
        
        // Create feedback document
        const feedbackData = {
          student_id: session.student_id,
          case_id: session.case_id,
          session_id: session._id,
          feedback_type: 'AUTO_GENERATED',
          ai_feedback: {
            overall_score: pythonResponse.feedback.overall_score,
            strengths: pythonResponse.feedback.strengths,
            areas_for_improvement: pythonResponse.feedback.areas_for_improvement,
            technical_assessment: pythonResponse.feedback.technical_assessment,
            communication_assessment: pythonResponse.feedback.communication_assessment,
            clinical_reasoning: pythonResponse.feedback.clinical_reasoning,
            generated_at: new Date(),
          },
          professor_feedback: {},
          status: 'PENDING_VALIDATION',
          created_at: new Date(),
          updated_at: new Date(),
        };
        
        await feedbacksCollection.insertOne(feedbackData);
        
        // Update session status
        await sessionsCollection.updateOne(
          { _id: session._id },
          { $set: { status: 'PENDING_VALIDATION' } }
        );
        
        console.log(`   ✅ Feedback generated successfully!`);
        console.log(`      Overall Score: ${pythonResponse.feedback.overall_score}`);
        
      } catch (error) {
        console.log(`   ❌ Error generating feedback: ${error.message}`);
        if (error.response) {
          console.log(`      Python API Error: ${JSON.stringify(error.response.data, null, 2)}`);
        }
      }
    }
    
    console.log('\n✅ Feedback generation complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await client.close();
  }
}

generateMissingFeedbacks();

