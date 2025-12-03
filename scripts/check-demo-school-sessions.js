#!/usr/bin/env node

/**
 * Check Demo School Sessions and Feedback Status
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function checkDemoSchool() {
  try {
    // Get base URI from environment
    const baseUri = process.env.MONGODB_BASE_URI;
    if (!baseUri) {
      throw new Error('MONGODB_BASE_URI not found in environment variables');
    }

    console.log('🔍 Connecting to demo_school database...\n');
    
    const connectionUrl = `${baseUri}/demo_school`;
    const connection = await mongoose.createConnection(connectionUrl).asPromise();
    
    console.log('✅ Connected!\n');
    
    // Get sessions
    const SessionCollection = connection.db.collection('studentcasesessions');
    const sessions = await SessionCollection.find({}).sort({ created_at: -1 }).toArray();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Found ${sessions.length} session(s) in demo_school`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    for (const [index, session] of sessions.entries()) {
      console.log(`\n📝 Session #${index + 1}:`);
      console.log('─────────────────────────────────────────────');
      console.log('  ID:', session._id.toString());
      console.log('  Case ID:', session.case_id?.toString() || 'N/A');
      console.log('  Student ID:', session.student_id?.toString() || 'N/A');
      console.log('  Status:', session.status);
      console.log('  Type:', session.session_type);
      console.log('  Messages:', session.messages?.length || 0);
      console.log('  Started:', session.started_at || session.created_at);
      console.log('  Ended:', session.ended_at || 'Not ended');
      console.log('  Created:', session.created_at);
      
      // Check feedback
      const FeedbackCollection = connection.db.collection('casefeedbacklogs');
      const feedback = await FeedbackCollection.findOne({ session_id: session._id });
      
      console.log('\n  🎯 Feedback Status:');
      if (feedback) {
        console.log('  ✅ HAS FEEDBACK!');
        console.log('     Feedback ID:', feedback._id.toString());
        console.log('     Status:', feedback.status);
        console.log('     Score:', feedback.ai_feedback?.overall_score || 'N/A');
      } else {
        console.log('  ❌ NO FEEDBACK FOUND!');
        console.log('\n  💡 Why no feedback?');
        
        if (session.status === 'ACTIVE') {
          console.log('     ⚠️  Session is still ACTIVE - not completed yet');
          console.log('     👉 Student needs to call: POST /api/internship/sessions/' + session._id + '/complete');
        } else if (session.status === 'COMPLETED') {
          console.log('     ⚠️  Session is COMPLETED but feedback was never generated!');
          console.log('     👉 THIS IS THE PROBLEM! After completing, must call:');
          console.log('        POST /api/internship/sessions/' + session._id + '/feedback');
        } else if (session.status === 'PENDING_VALIDATION') {
          console.log('     🤔 Session is PENDING_VALIDATION but no feedback in DB');
          console.log('     👉 Feedback generation might have failed. Check Python service logs.');
          console.log('     👉 Try calling again: POST /api/internship/sessions/' + session._id + '/feedback');
        }
      }
      
      console.log('\n  📋 What should happen:');
      console.log('     1. Student completes session: POST /api/internship/sessions/' + session._id + '/complete');
      console.log('     2. Student generates feedback: POST /api/internship/sessions/' + session._id + '/feedback');
      console.log('     3. Student views feedback: GET /api/internship/sessions/' + session._id + '/feedback');
    }
    
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Summary for demo_school:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const FeedbackCollection = connection.db.collection('casefeedbacklogs');
    const totalFeedbacks = await FeedbackCollection.countDocuments();
    
    const activeSessions = sessions.filter(s => s.status === 'ACTIVE').length;
    const completedSessions = sessions.filter(s => s.status === 'COMPLETED').length;
    const pendingValidation = sessions.filter(s => s.status === 'PENDING_VALIDATION').length;
    
    console.log('  Total Sessions:', sessions.length);
    console.log('  - Active:', activeSessions);
    console.log('  - Completed:', completedSessions);
    console.log('  - Pending Validation:', pendingValidation);
    console.log('  Total Feedbacks:', totalFeedbacks);
    console.log('  Missing Feedbacks:', sessions.length - totalFeedbacks);
    
    console.log('\n❗ THE ISSUE:');
    if (totalFeedbacks === 0 && completedSessions > 0) {
      console.log('  Sessions were completed but feedback generation endpoint was NEVER called!');
      console.log('  The frontend must call POST /api/internship/sessions/:id/feedback after completion.');
    } else if (totalFeedbacks === 0 && activeSessions > 0) {
      console.log('  Sessions are still active. Complete them first, then generate feedback.');
    } else if (totalFeedbacks === 0) {
      console.log('  No sessions have been properly completed yet.');
    }
    
    console.log('\n✨ Done!\n');
    
    await connection.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkDemoSchool()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

