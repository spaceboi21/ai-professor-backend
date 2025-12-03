/**
 * Script to check session feedbacks in the database
 * Usage: node scripts/check-feedbacks.js [school_db_name] [student_id]
 */

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection string from environment
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';

// Schemas
const CaseFeedbackLogSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  case_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InternshipCase' },
  session_id: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentCaseSession' },
  feedback_type: String,
  status: String,
  ai_feedback: Object,
  professor_feedback: Object,
  created_at: Date,
  updated_at: Date,
});

const StudentCaseSessionSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  case_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InternshipCase' },
  status: String,
  session_type: String,
  started_at: Date,
  ended_at: Date,
  messages: Array,
  created_at: Date,
  updated_at: Date,
});

async function checkFeedbacks(dbName, studentId) {
  try {
    console.log('🔍 Connecting to MongoDB...');
    
    // Connect to main MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Connect to tenant database
    const tenantConnection = mongoose.connection.useDb(dbName);
    console.log(`✅ Connected to tenant database: ${dbName}`);
    
    // Get models
    const CaseFeedbackLog = tenantConnection.model('CaseFeedbackLog', CaseFeedbackLogSchema, 'case_feedback_logs');
    const StudentCaseSession = tenantConnection.model('StudentCaseSession', StudentCaseSessionSchema, 'student_case_sessions');
    
    // Query feedbacks
    console.log('\n📊 Querying feedbacks...\n');
    
    const query = studentId ? { student_id: new mongoose.Types.ObjectId(studentId) } : {};
    
    const feedbacks = await CaseFeedbackLog.find(query)
      .sort({ created_at: -1 })
      .lean();
    
    console.log(`Found ${feedbacks.length} feedback(s)\n`);
    
    if (feedbacks.length === 0) {
      console.log('❌ No feedbacks found!');
      console.log('\nPossible reasons:');
      console.log('1. Student has not generated feedback yet (need to call POST /internship/sessions/:sessionId/feedback)');
      console.log('2. Wrong database name or student ID');
      console.log('3. Sessions exist but feedback was never generated');
    } else {
      for (const [index, feedback] of feedbacks.entries()) {
        console.log(`\n📝 Feedback #${index + 1}:`);
        console.log('  ID:', feedback._id);
        console.log('  Session ID:', feedback.session_id);
        console.log('  Case ID:', feedback.case_id);
        console.log('  Student ID:', feedback.student_id);
        console.log('  Status:', feedback.status);
        console.log('  Type:', feedback.feedback_type);
        console.log('  Overall Score:', feedback.ai_feedback?.overall_score || 'N/A');
        console.log('  Created:', feedback.created_at);
        console.log('  Updated:', feedback.updated_at);
        
        if (feedback.status === 'PENDING_VALIDATION') {
          console.log('  ⚠️  STATUS: Pending validation by professor');
          console.log('  ℹ️  Students can now see this feedback with the updated code');
        } else if (feedback.status === 'VALIDATED') {
          console.log('  ✅ STATUS: Validated by professor');
        } else if (feedback.status === 'REVISED') {
          console.log('  ✏️  STATUS: Revised by professor');
        }
      }
    }
    
    // Check sessions
    console.log('\n\n📊 Checking sessions...\n');
    
    const sessionQuery = studentId ? { student_id: new mongoose.Types.ObjectId(studentId) } : {};
    const sessions = await StudentCaseSession.find(sessionQuery)
      .sort({ created_at: -1 })
      .limit(10)
      .lean();
    
    console.log(`Found ${sessions.length} session(s) (showing last 10)\n`);
    
    for (const [index, session] of sessions.entries()) {
      console.log(`\n💬 Session #${index + 1}:`);
      console.log('  ID:', session._id);
      console.log('  Case ID:', session.case_id);
      console.log('  Student ID:', session.student_id);
      console.log('  Status:', session.status);
      console.log('  Type:', session.session_type);
      console.log('  Started:', session.started_at);
      console.log('  Ended:', session.ended_at);
      console.log('  Messages:', session.messages?.length || 0);
      
      // Check if this session has feedback
      const sessionFeedback = feedbacks.find(f => f.session_id.toString() === session._id.toString());
      if (sessionFeedback) {
        console.log('  ✅ Has feedback:', sessionFeedback._id);
      } else if (session.status === 'COMPLETED' || session.status === 'PENDING_VALIDATION') {
        console.log('  ⚠️  No feedback found! Call POST /internship/sessions/' + session._id + '/feedback to generate it');
      } else {
        console.log('  ℹ️  Session is still', session.status);
      }
    }
    
    console.log('\n\n✅ Done!\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

// Parse command line arguments
const dbName = process.argv[2];
const studentId = process.argv[3];

if (!dbName) {
  console.log('Usage: node scripts/check-feedbacks.js <school_db_name> [student_id]');
  console.log('\nExample:');
  console.log('  node scripts/check-feedbacks.js baby_ia_school_123');
  console.log('  node scripts/check-feedbacks.js baby_ia_school_123 507f1f77bcf86cd799439011');
  process.exit(1);
}

checkFeedbacks(dbName, studentId);

