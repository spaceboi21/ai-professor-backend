const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { MongoClient } = require('mongodb');

async function checkInternshipHealth() {
  const baseUri = process.env.MONGODB_BASE_URI;
  
  if (!baseUri) {
    console.error('❌ MONGODB_BASE_URI not found in .env');
    process.exit(1);
  }
  
  console.log('🔍 Checking Internship Module Health...\n');
  
  const client = new MongoClient(baseUri);
  
  try {
    await client.connect();
    
    // Get schools from central database
    const centralDb = client.db('central_database');
    const schools = await centralDb.collection('schools').find({ deleted_at: null }).toArray();
    
    console.log(`Found ${schools.length} schools\n`);
    console.log('='.repeat(80));
    
    for (const school of schools) {
      console.log(`\n📚 School: ${school.name}`);
      console.log(`   DB Name: ${school.db_name}`);
      console.log(`   Status: ${school.status}`);
      console.log('─'.repeat(80));
      
      const tenantDb = client.db(school.db_name);
      
      // Check internships
      const internships = await tenantDb.collection('internships').countDocuments();
      const cases = await tenantDb.collection('internshipcases').countDocuments();
      
      // Check sessions
      const sessions = await tenantDb.collection('studentcasesessions').find({}).toArray();
      const activeSessions = sessions.filter(s => s.status === 'ACTIVE');
      const completedSessions = sessions.filter(s => s.status === 'COMPLETED');
      const pendingValidationSessions = sessions.filter(s => s.status === 'PENDING_VALIDATION');
      
      // Check feedbacks
      const feedbacks = await tenantDb.collection('casefeedbacklogs').find({}).toArray();
      const pendingFeedbacks = feedbacks.filter(f => f.status === 'PENDING_VALIDATION');
      const validatedFeedbacks = feedbacks.filter(f => f.status === 'VALIDATED');
      
      console.log(`\n📊 Internship Data:`);
      console.log(`   Internships: ${internships}`);
      console.log(`   Cases: ${cases}`);
      
      console.log(`\n📝 Sessions:`);
      console.log(`   Total: ${sessions.length}`);
      console.log(`   Active: ${activeSessions.length}`);
      console.log(`   Completed: ${completedSessions.length}`);
      console.log(`   Pending Validation: ${pendingValidationSessions.length}`);
      
      console.log(`\n💬 Feedbacks:`);
      console.log(`   Total: ${feedbacks.length}`);
      console.log(`   Pending Validation: ${pendingFeedbacks.length}`);
      console.log(`   Validated: ${validatedFeedbacks.length}`);
      
      // Check for issues
      let issues = [];
      
      // Check active sessions
      if (activeSessions.length > 0) {
        console.log(`\n🔍 Analyzing Active Sessions:`);
        for (const session of activeSessions) {
          const hasPythonId = 
            (session.session_type === 'PATIENT_INTERVIEW' && session.patient_session_id) ||
            (session.session_type === 'THERAPIST_CONSULTATION' && session.therapist_session_id);
          
          const sessionAge = (Date.now() - new Date(session.started_at || session.created_at)) / (1000 * 60 * 60);
          
          console.log(`\n   Session ID: ${session._id}`);
          console.log(`   Type: ${session.session_type}`);
          console.log(`   Student: ${session.student_id}`);
          console.log(`   Messages: ${session.messages?.length || 0}`);
          console.log(`   Age: ${sessionAge.toFixed(1)} hours`);
          console.log(`   Python Session ID: ${hasPythonId ? '✅ Present' : '❌ MISSING'}`);
          
          if (!hasPythonId) {
            issues.push(`Session ${session._id} missing Python session ID`);
          }
          
          if (sessionAge > 24) {
            issues.push(`Session ${session._id} is ${sessionAge.toFixed(1)}h old (may be expired in Python)`);
          }
        }
      }
      
      // Check completed sessions without feedback
      const completedSessionIds = completedSessions.map(s => s._id.toString());
      const feedbackSessionIds = feedbacks.map(f => f.session_id?.toString());
      const sessionsWithoutFeedback = completedSessionIds.filter(id => !feedbackSessionIds.includes(id));
      
      if (sessionsWithoutFeedback.length > 0) {
        console.log(`\n⚠️  Completed Sessions Without Feedback: ${sessionsWithoutFeedback.length}`);
        issues.push(`${sessionsWithoutFeedback.length} completed sessions have no feedback`);
      }
      
      // Summary
      if (issues.length > 0) {
        console.log(`\n⚠️  Issues Found (${issues.length}):`);
        issues.forEach((issue, i) => console.log(`   ${i + 1}. ${issue}`));
      } else {
        console.log(`\n✅ No issues found for this school`);
      }
      
      console.log('\n' + '='.repeat(80));
    }
    
    console.log('\n✅ Health check complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await client.close();
  }
}

checkInternshipHealth();

