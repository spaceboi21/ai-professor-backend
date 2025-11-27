import * as mongoose from 'mongoose';
import { Types } from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Import schemas
import { UserSchema } from '../schemas/central/user.schema';
import { SchoolSchema } from '../schemas/central/school.schema';
import { StudentSchema } from '../schemas/tenant/student.schema';
import { InternshipSchema } from '../schemas/tenant/internship.schema';
import { InternshipCaseSchema } from '../schemas/tenant/internship-case.schema';
import { StudentCaseSessionSchema } from '../schemas/tenant/student-case-session.schema';
import { CaseFeedbackLogSchema } from '../schemas/tenant/case-feedback-log.schema';
import { StudentLogbookSchema } from '../schemas/tenant/student-logbook.schema';
import { StudentInternshipProgressSchema } from '../schemas/tenant/student-internship-progress.schema';

// Constants
import { RoleEnum } from '../../common/constants/roles.constant';
import { ROLE_IDS } from '../../common/constants/roles.constant';
import { 
  SessionTypeEnum, 
  SessionStatusEnum, 
  MessageRoleEnum,
  FeedbackTypeEnum,
  FeedbackStatusEnum 
} from '../../common/constants/internship.constant';
import { StatusEnum } from '../../common/constants/status.constant';
import { LanguageEnum } from '../../common/constants/language.constant';

// Configuration
const SCHOOL_ADMIN_ID = '69014a58b8bc3f208a16f508'; // From postman collection
const SCHOOL_ID = '69014a58b8bc3f208a16f506'; // From postman collection

// Seed data
const seedInternshipData = async () => {
  let centralConnection: mongoose.Connection | undefined;
  let tenantConnection: mongoose.Connection | undefined;

  try {
    console.log('🌱 Starting Internship seed process...\n');

    // Connect to central database
    const centralUri = process.env.CENTRAL_DB_URI || process.env.MONGODB_URI;
    if (!centralUri) {
      throw new Error('CENTRAL_DB_URI or MONGODB_URI not found in environment variables');
    }
    console.log('📡 Connecting to central database...');
    centralConnection = await mongoose.createConnection(centralUri);
    console.log('✅ Connected to central database\n');

    // Get models from central database
    const UserModel = centralConnection.model('User', UserSchema);
    const SchoolModel = centralConnection.model('School', SchoolSchema);

    // Verify school admin and school exist
    console.log('🔍 Verifying school admin and school...');
    const schoolAdmin = await UserModel.findById(SCHOOL_ADMIN_ID);
    if (!schoolAdmin) {
      throw new Error(`School admin with ID ${SCHOOL_ADMIN_ID} not found`);
    }
    console.log(`✅ School admin found: ${schoolAdmin.email}`);

    const school = await SchoolModel.findById(SCHOOL_ID);
    if (!school) {
      throw new Error(`School with ID ${SCHOOL_ID} not found`);
    }
    console.log(`✅ School found: ${school.name}`);
    console.log(`📊 Tenant DB: ${school.db_name}\n`);

    // Connect to tenant database
    const baseUri = process.env.MONGODB_BASE_URI;
    if (!baseUri) {
      throw new Error('MONGODB_BASE_URI not found in environment variables');
    }
    const tenantUri = `${baseUri}/${school.db_name}`;
    console.log('📡 Connecting to tenant database...');
    tenantConnection = await mongoose.createConnection(tenantUri);
    console.log('✅ Connected to tenant database\n');

    // Get tenant models
    const StudentModel = tenantConnection.model('Student', StudentSchema);
    const InternshipModel = tenantConnection.model('Internship', InternshipSchema);
    const InternshipCaseModel = tenantConnection.model('InternshipCase', InternshipCaseSchema);
    const SessionModel = tenantConnection.model('StudentCaseSession', StudentCaseSessionSchema);
    const FeedbackModel = tenantConnection.model('CaseFeedbackLog', CaseFeedbackLogSchema);
    const LogbookModel = tenantConnection.model('StudentLogbook', StudentLogbookSchema);
    const ProgressModel = tenantConnection.model('StudentInternshipProgress', StudentInternshipProgressSchema);

    // 1. Create or find a student
    console.log('👨‍🎓 Creating/finding student...');
    let student = await StudentModel.findOne({ 
      email: 'test.student@example.com',
      school_id: new Types.ObjectId(SCHOOL_ID) 
    });

    if (!student) {
      student = await StudentModel.create({
        first_name: 'Test',
        last_name: 'Student',
        email: 'test.student@example.com',
        password: '$2b$10$YourHashedPasswordHere', // Hashed password
        student_code: 'STU2025001',
        school_id: new Types.ObjectId(SCHOOL_ID),
        created_by: new Types.ObjectId(SCHOOL_ADMIN_ID),
        created_by_role: RoleEnum.SCHOOL_ADMIN,
        role: new Types.ObjectId(ROLE_IDS.STUDENT),
        status: StatusEnum.ACTIVE,
        preferred_language: LanguageEnum.ENGLISH,
        year: 3,
        profile_pic: 'https://ui-avatars.com/api/?name=Test+Student&background=4F46E5&color=fff',
      });
      console.log(`✅ Student created: ${student.email} (ID: ${student._id})`);
    } else {
      console.log(`✅ Student found: ${student.email} (ID: ${student._id})`);
    }

    // 2. Create Internship
    console.log('\n📚 Creating internship...');
    const internship = await InternshipModel.create({
      title: 'Clinical Psychology Internship - Year 3',
      description: 'This internship provides hands-on experience in clinical psychology with real patient cases. Students will practice assessment, diagnosis, and therapy techniques under AI supervision.',
      guidelines: `<h2>Guidelines for Students</h2>
<ul>
  <li>Complete all cases in sequence</li>
  <li>Spend minimum 30 minutes per patient interview</li>
  <li>Document all observations in your logbook</li>
  <li>Real-time supervision available</li>
  <li>Professor validation required for feedback</li>
</ul>
<h2>Learning Objectives</h2>
<ul>
  <li>Develop effective clinical interviewing skills</li>
  <li>Practice mental status examination</li>
  <li>Learn differential diagnosis techniques</li>
  <li>Build therapeutic rapport with patients</li>
  <li>Assess suicide risk appropriately</li>
</ul>`,
      created_by: new Types.ObjectId(SCHOOL_ADMIN_ID),
      created_by_role: RoleEnum.SCHOOL_ADMIN,
      year: 3,
      published: true,
      published_at: new Date(),
      thumbnail: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800',
      duration: 40,
      sequence: 1,
    });
    console.log(`✅ Internship created: ${internship.title} (ID: ${internship._id})`);

    // 3. Create Case
    console.log('\n📋 Creating case...');
    const internshipCase = await InternshipCaseModel.create({
      internship_id: internship._id,
      title: 'Major Depressive Disorder - Initial Assessment',
      description: 'Patient John, 35-year-old male, presents with 6-week history of depressed mood, anhedonia, and psychomotor retardation.',
      sequence: 1,
      case_content: `<h2>Patient Presentation</h2>
<p><strong>Chief Complaint:</strong> "I just don't feel like myself anymore."</p>

<h3>History of Present Illness</h3>
<p>Patient is a 35-year-old male presenting with a 6-week history of persistent depressed mood. Symptoms began shortly after he lost his job as a marketing manager. He reports:</p>
<ul>
  <li>Pervasive sadness throughout the day</li>
  <li>Loss of interest in previously enjoyed activities (anhedonia)</li>
  <li>Early morning awakening (3 AM) with inability to return to sleep</li>
  <li>Decreased appetite with 15-pound weight loss</li>
  <li>Psychomotor retardation</li>
  <li>Difficulty concentrating at work interviews</li>
  <li>Feelings of worthlessness</li>
  <li>Passive death wish but denies active suicidal ideation</li>
</ul>

<h3>Past Psychiatric History</h3>
<p>One previous depressive episode 5 years ago, successfully treated with sertraline 100mg for 8 months. No hospitalizations. No suicide attempts.</p>

<h3>Social History</h3>
<p>Married for 8 years, supportive wife. Two children ages 6 and 4. Recently unemployed (2 months). Denies alcohol or substance use. Non-smoker.</p>

<h3>Mental Status Exam</h3>
<ul>
  <li><strong>Appearance:</strong> Casually dressed, poor grooming</li>
  <li><strong>Behavior:</strong> Psychomotor retardation, minimal eye contact</li>
  <li><strong>Speech:</strong> Soft, slow, increased latency</li>
  <li><strong>Mood:</strong> "Hopeless"</li>
  <li><strong>Affect:</strong> Constricted, depressed</li>
  <li><strong>Thought Process:</strong> Linear, goal-directed</li>
  <li><strong>Thought Content:</strong> Preoccupied with job loss, feelings of failure. Denies SI/HI/AVH</li>
  <li><strong>Cognition:</strong> Alert, oriented x3. Concentration impaired.</li>
  <li><strong>Insight:</strong> Good - recognizes need for help</li>
  <li><strong>Judgment:</strong> Fair</li>
</ul>

<h3>Assessment</h3>
<p>Patient presents with Major Depressive Disorder, single episode, moderate severity. Differential diagnoses include adjustment disorder with depressed mood and dysthymia. No current suicide risk but requires close monitoring.</p>`,
      case_documents: [
        {
          url: 'https://example.com/case-documents/john-medical-records.pdf',
          type: 'application/pdf',
          name: 'Medical Records - Lab Results',
        },
        {
          url: 'https://example.com/case-documents/john-previous-treatment.pdf',
          type: 'application/pdf',
          name: 'Previous Treatment Summary',
        },
      ],
      patient_simulation_config: {
        patient_profile: {
          name: 'John Smith',
          age: 35,
          gender: 'male',
          condition: 'Major Depressive Disorder',
          chief_complaint: 'I just don\'t feel like myself anymore',
          presentation_style: 'withdrawn, soft-spoken, psychomotor retardation',
        },
        scenario_type: 'clinical_interview',
        difficulty_level: 'intermediate',
      },
      supervisor_prompts: [
        'Monitor student\'s empathy and rapport-building skills',
        'Check if student assesses suicide risk appropriately',
        'Evaluate proper mental status exam technique',
        'Ensure student explores precipitating factors',
        'Check if student considers differential diagnosis',
      ],
      therapist_prompts: [
        'Guide student on building therapeutic alliance with depressed patients',
        'Explain importance of suicide risk assessment',
        'Teach CBT techniques for depression',
        'Discuss medication options and their rationale',
        'Explain importance of involving family support',
      ],
      evaluation_criteria: [
        { criterion: 'Clinical Reasoning', weight: 30 },
        { criterion: 'Communication Skills & Empathy', weight: 25 },
        { criterion: 'Mental Status Exam Technique', weight: 20 },
        { criterion: 'Risk Assessment', weight: 15 },
        { criterion: 'Treatment Planning', weight: 10 },
      ],
      created_by: new Types.ObjectId(SCHOOL_ADMIN_ID),
      created_by_role: RoleEnum.SCHOOL_ADMIN,
    });
    console.log(`✅ Case created: ${internshipCase.title} (ID: ${internshipCase._id})`);

    // 4. Create Session with Messages
    console.log('\n💬 Creating session with messages...');
    const session = await SessionModel.create({
      student_id: student._id,
      internship_id: internship._id,
      case_id: internshipCase._id,
      session_type: SessionTypeEnum.PATIENT_INTERVIEW,
      status: SessionStatusEnum.COMPLETED,
      started_at: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
      ended_at: new Date(),
      patient_session_id: 'python_session_' + new Types.ObjectId().toString(),
      messages: [
        {
          role: MessageRoleEnum.STUDENT,
          content: 'Hello John, thank you for coming in today. Can you tell me what brings you here?',
          timestamp: new Date(Date.now() - 44 * 60 * 1000),
          metadata: {},
        },
        {
          role: MessageRoleEnum.AI_PATIENT,
          content: 'Hi... *looks down* I just... I don\'t know. I haven\'t been feeling like myself lately. My wife thought I should come talk to someone.',
          timestamp: new Date(Date.now() - 43 * 60 * 1000),
          metadata: {},
        },
        {
          role: MessageRoleEnum.STUDENT,
          content: 'I appreciate you being here. Can you help me understand what "not feeling like yourself" means for you?',
          timestamp: new Date(Date.now() - 42 * 60 * 1000),
          metadata: {},
        },
        {
          role: MessageRoleEnum.AI_PATIENT,
          content: '*pauses* Everything just feels... heavy. I wake up at 3 AM most mornings and can\'t get back to sleep. During the day, I have no energy. Things that used to make me happy - playing with my kids, watching movies - they just don\'t interest me anymore.',
          timestamp: new Date(Date.now() - 41 * 60 * 1000),
          metadata: {},
        },
        {
          role: MessageRoleEnum.STUDENT,
          content: 'That sounds really difficult. How long have you been experiencing these feelings?',
          timestamp: new Date(Date.now() - 40 * 60 * 1000),
          metadata: {},
        },
        {
          role: MessageRoleEnum.AI_PATIENT,
          content: 'About six weeks now. It started after I lost my job. I was a marketing manager for 8 years, and they let me go during restructuring. Since then, it\'s been downhill.',
          timestamp: new Date(Date.now() - 39 * 60 * 1000),
          metadata: {},
        },
        {
          role: MessageRoleEnum.STUDENT,
          content: 'I can understand how losing your job could be very stressful. Have you noticed any changes in your appetite or weight?',
          timestamp: new Date(Date.now() - 38 * 60 * 1000),
          metadata: {},
        },
        {
          role: MessageRoleEnum.AI_PATIENT,
          content: 'Yeah, I\'ve lost about 15 pounds. I just don\'t have an appetite. My wife tries to make my favorite meals, but nothing tastes good anymore.',
          timestamp: new Date(Date.now() - 37 * 60 * 1000),
          metadata: {},
        },
        {
          role: MessageRoleEnum.STUDENT,
          content: 'John, I need to ask you about something important. Have you had any thoughts about harming yourself or ending your life?',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          metadata: {},
        },
        {
          role: MessageRoleEnum.AI_PATIENT,
          content: '*looks up briefly* Sometimes I think everyone would be better off without me. But I wouldn\'t actually do anything. I have my kids to think about. I could never do that to them.',
          timestamp: new Date(Date.now() - 29 * 60 * 1000),
          metadata: {},
        },
        {
          role: MessageRoleEnum.STUDENT,
          content: 'Thank you for being honest with me about that. It takes courage to share these feelings. Your family sounds like they\'re important to you. Have you been able to talk to your wife about how you\'re feeling?',
          timestamp: new Date(Date.now() - 28 * 60 * 1000),
          metadata: {},
        },
        {
          role: MessageRoleEnum.AI_PATIENT,
          content: 'She knows I\'m struggling, but I don\'t want to burden her more than I already have. She\'s been working extra hours to make up for my lost income. I feel like such a failure.',
          timestamp: new Date(Date.now() - 27 * 60 * 1000),
          metadata: {},
        },
      ],
      realtime_tips: [
        {
          message: 'Good job establishing rapport and using open-ended questions',
          context: 'Communication Skills',
          timestamp: new Date(Date.now() - 42 * 60 * 1000),
        },
        {
          message: 'Excellent suicide risk assessment - direct and empathetic approach',
          context: 'Risk Assessment',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
        },
        {
          message: 'Consider exploring the timeline of symptoms in more detail',
          context: 'Clinical Reasoning',
          timestamp: new Date(Date.now() - 35 * 60 * 1000),
        },
      ],
    });
    console.log(`✅ Session created with ${session.messages.length} messages (ID: ${session._id})`);

    // 5. Create Feedback
    console.log('\n📝 Creating feedback...');
    const feedback = await FeedbackModel.create({
      student_id: student._id,
      case_id: internshipCase._id,
      session_id: session._id,
      feedback_type: FeedbackTypeEnum.AUTO_GENERATED,
      status: FeedbackStatusEnum.VALIDATED,
      ai_feedback: {
        overall_score: 85,
        strengths: [
          'Excellent rapport building and empathetic communication',
          'Appropriate and sensitive suicide risk assessment',
          'Good use of open-ended questions',
          'Created a safe, non-judgmental environment',
        ],
        areas_for_improvement: [
          'Explore timeline of symptoms more systematically',
          'Consider broader differential diagnosis',
          'Ask about previous psychiatric history earlier',
          'Inquire about substance use more directly',
        ],
        technical_assessment: {
          score: 80,
          comments: 'Demonstrated solid clinical interviewing technique. Mental status exam was conducted but could be more thorough.',
        },
        communication_assessment: {
          score: 90,
          comments: 'Outstanding empathy and active listening skills. Patient felt comfortable sharing difficult emotions.',
        },
        clinical_reasoning: {
          score: 85,
          comments: 'Good identification of depressive symptoms. Would benefit from more systematic approach to ruling out other conditions.',
        },
        generated_at: new Date(),
      },
      professor_feedback: {
        validated_by: new Types.ObjectId(SCHOOL_ADMIN_ID),
        is_approved: true,
        professor_comments: 'Excellent work on establishing rapport with the patient. Your empathy and active listening skills were evident throughout the interview. Good use of open-ended questions to explore the patient\'s concerns. The suicide risk assessment was handled sensitively and appropriately. For future interviews, consider exploring the timeline of symptoms more systematically and developing a broader differential diagnosis. Overall, this demonstrates strong foundational skills in clinical interviewing.',
        edited_score: 88,
        validation_date: new Date(),
      },
    });
    console.log(`✅ Feedback created with score: ${feedback.ai_feedback.overall_score} (Professor adjusted to ${feedback.professor_feedback.edited_score})`);
    console.log(`   ID: ${feedback._id}`);

    // 6. Create Logbook Entry
    console.log('\n📔 Creating logbook entry...');
    let logbook = await LogbookModel.findOne({
      student_id: student._id,
      internship_id: internship._id,
    });

    if (!logbook) {
      logbook = await LogbookModel.create({
        student_id: student._id,
        internship_id: internship._id,
        entries: [],
        total_hours: 0,
      });
    }

    logbook.entries.push({
      case_id: internshipCase._id,
      case_title: internshipCase.title,
      completed_date: new Date(),
      session_summary: 'Conducted comprehensive clinical interview with 35-year-old male patient presenting with 6-week history of depressed mood. Successfully established rapport and gathered detailed history of present illness. Patient was cooperative and demonstrated good insight into his condition.',
      skills_practiced: [
        'Active listening',
        'Empathy building',
        'Clinical interviewing',
        'Mental status examination',
        'Suicide risk assessment',
        'Differential diagnosis formulation',
      ],
      feedback_summary: `Professor feedback: Excellent rapport building. Strong empathy demonstrated. Good use of open-ended questions. Areas for improvement: explore timeline of symptoms more thoroughly, consider broader differential diagnosis. Overall score: 88/100`,
      self_reflection: 'I felt confident in establishing rapport with the patient and creating a safe space for disclosure. However, I realized I could have probed deeper into the chronology of symptom onset. I also need to improve my systematic approach to differential diagnosis. The suicide risk assessment felt natural, and I\'m glad I asked directly. Overall, this was a valuable learning experience that highlighted both my strengths in interpersonal skills and areas for growth in clinical reasoning. I\'m looking forward to applying these lessons in my next patient interview.',
      attachments: [],
    } as any);

    logbook.total_hours += 0.75; // 45 minutes = 0.75 hours
    logbook.overall_progress_summary = 'Student has completed 1 case in the Clinical Psychology Internship. Demonstrates strong interpersonal and empathy skills with good rapport-building abilities. Shows solid foundation in clinical interviewing techniques and appropriate suicide risk assessment. Areas for continued development include systematic symptom timeline exploration and differential diagnosis formulation. Overall performance indicates readiness to progress to more complex cases with continued supervision.';

    await logbook.save();
    console.log(`✅ Logbook entry added (Total entries: ${logbook.entries.length}, Total hours: ${logbook.total_hours})`);

    // 7. Create Student Progress
    console.log('\n📈 Creating student progress...');
    const progress = await ProgressModel.create({
      student_id: student._id,
      internship_id: internship._id,
      case_progress: [
        {
          case_id: internshipCase._id,
          status: 'completed' as any,
          started_at: session.started_at,
          completed_at: session.ended_at,
          sessions_completed: 1,
          feedback_received: true,
        },
      ],
      overall_status: 'in_progress' as any,
      completion_percentage: 100, // 1 out of 1 case completed
      total_time_spent: 45, // minutes
    });
    console.log(`✅ Student progress created (ID: ${progress._id})`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✨ SEED COMPLETED SUCCESSFULLY! ✨');
    console.log('='.repeat(60));
    console.log('\n📋 Created Resources:');
    console.log(`   👨‍🎓 Student ID: ${student._id}`);
    console.log(`   📚 Internship ID: ${internship._id}`);
    console.log(`   📋 Case ID: ${internshipCase._id}`);
    console.log(`   💬 Session ID: ${session._id}`);
    console.log(`   📝 Feedback ID: ${feedback._id}`);
    console.log(`   📔 Logbook ID: ${logbook._id}`);
    console.log(`   📈 Progress ID: ${progress._id}`);
    console.log('\n💡 Next Steps:');
    console.log('   1. Import the Postman collection: internship-api.postman_collection.json');
    console.log('   2. Update the variables with the IDs above');
    console.log('   3. Test all endpoints in this order:');
    console.log('      - School Admin - Internship Management (endpoints 1-7)');
    console.log('      - School Admin - Case Management (endpoints 1-6)');
    console.log('      - Student - Session Management (endpoints 1-4)');
    console.log('      - Feedback Management (endpoints 1-5)');
    console.log('      - Student - Logbook (endpoints 1-3)');
    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Error during seed process:', error);
    throw error;
  } finally {
    // Close connections
    if (centralConnection) {
      await centralConnection.close();
      console.log('🔌 Central database connection closed');
    }
    if (tenantConnection) {
      await tenantConnection.close();
      console.log('🔌 Tenant database connection closed');
    }
  }
};

// Run seed
if (require.main === module) {
  seedInternshipData()
    .then(() => {
      console.log('👋 Seed script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seed script failed:', error);
      process.exit(1);
    });
}

export { seedInternshipData };

