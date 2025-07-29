/**
 * Test Script for Student Quiz Groups (Student & Admin Access)
 *
 * This script demonstrates the flexible functionality where:
 * 1. Students can view their own attempted quiz groups and analytics
 * 2. Admins can view any student's attempted quiz groups and analytics
 * 3. Both can use pagination and filtering
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000/api';
const STUDENT_TOKEN = 'your_student_jwt_token_here';
const ADMIN_TOKEN = 'your_admin_jwt_token_here'; // School Admin or Professor token

/**
 * Test Student Access (Student viewing their own data)
 */
async function testStudentAccess() {
  console.log('\n🧪 Testing Student Access (Viewing Own Data)');
  console.log('='.repeat(60));

  try {
    // Step 1: Get attempted quiz groups (student viewing own data)
    console.log("📊 Getting student's own attempted quiz groups...");
    const response = await axios.get(
      `${BASE_URL}/quiz/student/attempted-groups`,
      {
        headers: { Authorization: `Bearer ${STUDENT_TOKEN}` },
        params: {
          page: 1,
          limit: 5,
        },
      },
    );

    console.log('✅ Student accessed their own data successfully');
    console.log(
      `📈 Total quiz groups attempted: ${response.data.summary.total_quiz_groups_attempted}`,
    );
    console.log(`📊 Total attempts: ${response.data.summary.total_attempts}`);
    console.log(
      `🎯 Average pass rate: ${response.data.summary.average_pass_rate}%`,
    );

    // Display pagination information
    if (response.data.pagination) {
      console.log('\n📄 Pagination Information:');
      console.log(`   📄 Current page: ${response.data.pagination.page}`);
      console.log(`   📊 Items per page: ${response.data.pagination.limit}`);
      console.log(`   📈 Total items: ${response.data.pagination.total}`);
      console.log(`   📚 Total pages: ${response.data.pagination.totalPages}`);
    }

    // Display each quiz group with summary
    response.data.attempted_quiz_groups.forEach((group, index) => {
      console.log(`\n📋 Quiz Group ${index + 1}: ${group.quiz_group.subject}`);
      console.log(`   📝 Description: ${group.quiz_group.description}`);
      console.log(`   📊 Total attempts: ${group.total_attempts}`);
      console.log(`   📈 Average score: ${group.average_score}%`);
      console.log(`   🎯 Pass rate: ${group.pass_rate}%`);
      console.log(`   🏆 Best score: ${group.best_score}%`);
      console.log(`   📉 Worst score: ${group.worst_score}%`);
    });

    return response.data.attempted_quiz_groups;
  } catch (error) {
    console.error(
      '❌ Student access test failed:',
      error.response?.data || error.message,
    );
    return null;
  }
}

/**
 * Test Admin Access (Admin viewing student data)
 */
async function testAdminAccess(studentId) {
  console.log('\n🧪 Testing Admin Access (Viewing Student Data)');
  console.log('='.repeat(60));

  try {
    // Step 1: Get attempted quiz groups (admin viewing student data)
    console.log(
      `📊 Admin getting attempted quiz groups for student: ${studentId}...`,
    );
    const response = await axios.get(
      `${BASE_URL}/quiz/student/attempted-groups`,
      {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
        params: {
          page: 1,
          limit: 5,
          student_id: studentId,
        },
      },
    );

    console.log('✅ Admin accessed student data successfully');
    console.log(
      `📈 Total quiz groups attempted: ${response.data.summary.total_quiz_groups_attempted}`,
    );
    console.log(`📊 Total attempts: ${response.data.summary.total_attempts}`);
    console.log(
      `🎯 Average pass rate: ${response.data.summary.average_pass_rate}%`,
    );

    // Display student info for admin access
    if (response.data.student_info) {
      console.log('\n👤 Student Information:');
      console.log(`   🆔 Student ID: ${response.data.student_info.student_id}`);
      console.log(
        `   👨‍💼 Accessed by: ${response.data.student_info.accessed_by}`,
      );
      console.log(
        `   🆔 Admin ID: ${response.data.student_info.accessed_by_id}`,
      );
    }

    // Display pagination information
    if (response.data.pagination) {
      console.log('\n📄 Pagination Information:');
      console.log(`   📄 Current page: ${response.data.pagination.page}`);
      console.log(`   📊 Items per page: ${response.data.pagination.limit}`);
      console.log(`   📈 Total items: ${response.data.pagination.total}`);
      console.log(`   📚 Total pages: ${response.data.pagination.totalPages}`);
    }

    // Display each quiz group with summary
    response.data.attempted_quiz_groups.forEach((group, index) => {
      console.log(`\n📋 Quiz Group ${index + 1}: ${group.quiz_group.subject}`);
      console.log(`   📝 Description: ${group.quiz_group.description}`);
      console.log(`   📊 Total attempts: ${group.total_attempts}`);
      console.log(`   📈 Average score: ${group.average_score}%`);
      console.log(`   🎯 Pass rate: ${group.pass_rate}%`);
      console.log(`   🏆 Best score: ${group.best_score}%`);
      console.log(`   📉 Worst score: ${group.worst_score}%`);
    });

    return response.data.attempted_quiz_groups;
  } catch (error) {
    console.error(
      '❌ Admin access test failed:',
      error.response?.data || error.message,
    );
    return null;
  }
}

/**
 * Test Detailed Analytics for Admin
 */
async function testAdminDetailedAnalytics(studentId, quizGroupId) {
  console.log('\n🧪 Testing Admin Detailed Analytics');
  console.log('='.repeat(60));

  try {
    console.log(
      `📊 Admin getting detailed analytics for student: ${studentId}, quiz group: ${quizGroupId}`,
    );
    const response = await axios.get(`${BASE_URL}/quiz/student/analytics`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      params: {
        student_id: studentId,
        quiz_group_id: quizGroupId,
      },
    });

    console.log('✅ Admin detailed analytics retrieved successfully');
    console.log(`📈 Total attempts: ${response.data.summary.total_attempts}`);
    console.log(`📊 Average score: ${response.data.summary.average_score}%`);
    console.log(`🎯 Pass rate: ${response.data.summary.pass_rate}%`);
    console.log(
      `⏱️ Average time taken: ${response.data.summary.average_time_taken} seconds`,
    );
    console.log(`🏆 Best score: ${response.data.summary.best_score}%`);
    console.log(`📉 Worst score: ${response.data.summary.worst_score}%`);

    // Display student info for admin access
    if (response.data.student_info) {
      console.log('\n👤 Student Information:');
      console.log(`   🆔 Student ID: ${response.data.student_info.student_id}`);
      console.log(
        `   👨‍💼 Accessed by: ${response.data.student_info.accessed_by}`,
      );
      console.log(
        `   🆔 Admin ID: ${response.data.student_info.accessed_by_id}`,
      );
    }

    // Display attempt details
    response.data.attempts.forEach((attempt, index) => {
      console.log(`\n📋 Attempt ${index + 1}: ${attempt.quiz_group.subject}`);
      console.log(`   📊 Score: ${attempt.score_percentage}%`);
      console.log(`   ✅ Passed: ${attempt.is_passed ? 'Yes' : 'No'}`);
      console.log(`   ⏱️ Time taken: ${attempt.time_taken_seconds} seconds`);
      console.log(
        `   📅 Completed: ${new Date(attempt.completed_at).toLocaleString()}`,
      );

      // Show question breakdown
      if (attempt.question_breakdown.length > 0) {
        console.log(`   ❓ Question breakdown:`);
        attempt.question_breakdown.forEach((question, qIndex) => {
          const status = question.is_correct ? '✅' : '❌';
          console.log(
            `      ${qIndex + 1}. ${status} Question ${question.sequence}: ${question.time_spent_seconds}s`,
          );
        });
      }
    });

    return true;
  } catch (error) {
    console.error(
      '❌ Admin detailed analytics test failed:',
      error.response?.data || error.message,
    );
    return false;
  }
}

/**
 * Test Error Cases
 */
async function testErrorCases() {
  console.log('\n🧪 Testing Error Cases');
  console.log('='.repeat(60));

  try {
    // Test 1: Admin accessing without student_id
    console.log('📊 Testing admin access without student_id...');
    try {
      await axios.get(`${BASE_URL}/quiz/student/attempted-groups`, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
        params: {
          page: 1,
          limit: 5,
        },
      });
      console.log('❌ Should have failed - admin access without student_id');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Correctly rejected admin access without student_id');
      } else {
        console.log(
          '❌ Unexpected error:',
          error.response?.data || error.message,
        );
      }
    }

    // Test 2: Student trying to access another student's data
    console.log(
      "\n📊 Testing student trying to access another student's data...",
    );
    try {
      await axios.get(`${BASE_URL}/quiz/student/attempted-groups`, {
        headers: { Authorization: `Bearer ${STUDENT_TOKEN}` },
        params: {
          page: 1,
          limit: 5,
          student_id: '507f1f77bcf86cd799439011', // Another student ID
        },
      });
      console.log(
        "❌ Should have failed - student accessing another student's data",
      );
    } catch (error) {
      if (error.response?.status === 400) {
        console.log(
          "✅ Correctly rejected student accessing another student's data",
        );
      } else {
        console.log(
          '❌ Unexpected error:',
          error.response?.data || error.message,
        );
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Error cases test failed:', error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Student Quiz Groups Test Suite');
  console.log('='.repeat(60));

  const results = {
    studentAccess: false,
    adminAccess: false,
    adminDetailedAnalytics: false,
    errorCases: false,
  };

  try {
    // Test 1: Student Access
    results.studentAccess = await testStudentAccess();

    // Test 2: Admin Access (using a dummy student ID)
    results.adminAccess = await testAdminAccess('507f1f77bcf86cd799439011'); // Replace with a valid student ID

    // Test 3: Admin Detailed Analytics (using a dummy student ID and quiz group ID)
    results.adminDetailedAnalytics = await testAdminDetailedAnalytics(
      '507f1f77bcf86cd799439011',
      '507f1f77bcf86cd799439011',
    ); // Replace with a valid student ID and quiz group ID

    // Test 4: Error Cases
    results.errorCases = await testErrorCases();

    // Summary
    console.log('\n📊 Test Results Summary');
    console.log('='.repeat(60));
    console.log(
      `✅ Student Access: ${results.studentAccess ? 'PASSED' : 'FAILED'}`,
    );
    console.log(
      `✅ Admin Access: ${results.adminAccess ? 'PASSED' : 'FAILED'}`,
    );
    console.log(
      `✅ Admin Detailed Analytics: ${results.adminDetailedAnalytics ? 'PASSED' : 'FAILED'}`,
    );
    console.log(`✅ Error Cases: ${results.errorCases ? 'PASSED' : 'FAILED'}`);

    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;

    console.log(
      `\n🎯 Overall Result: ${passedTests}/${totalTests} tests passed`,
    );

    if (passedTests === totalTests) {
      console.log(
        '🎉 All tests passed! Student quiz groups functionality is working correctly.',
      );
    } else {
      console.log('⚠️ Some tests failed. Please check the implementation.');
    }
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

// Example API usage
const exampleUsage = `
📚 Example API Usage:

1. Student Access (Viewing Own Data):
   GET /api/quiz/student/attempted-groups?page=1&limit=10
   Headers: Authorization: Bearer <student_token>

2. Admin Access (Viewing Student Data):
   GET /api/quiz/student/attempted-groups?page=1&limit=10&student_id=507f1f77bcf86cd799439011
   Headers: Authorization: Bearer <admin_token>

3. Student Detailed Analytics (Own Data):
   GET /api/quiz/student/analytics?quiz_group_id=507f1f77bcf86cd799439011
   Headers: Authorization: Bearer <student_token>

4. Admin Detailed Analytics (Student Data):
   GET /api/quiz/student/analytics?student_id=507f1f77bcf86cd799439011&quiz_group_id=507f1f77bcf86cd799439011
   Headers: Authorization: Bearer <admin_token>

5. Student Export (Own Data):
   GET /api/quiz/student/analytics/export?format=csv
   Headers: Authorization: Bearer <student_token>

6. Admin Export (Student Data):
   GET /api/quiz/student/analytics/export?format=csv&student_id=507f1f77bcf86cd799439011
   Headers: Authorization: Bearer <admin_token>

7. Pagination Examples:
   - First page: ?page=1&limit=10
   - Second page: ?page=2&limit=10
   - Custom limit: ?page=1&limit=20
   - Maximum limit: ?page=1&limit=50

8. Filter Examples:
   - By quiz group: ?quiz_group_id=507f1f77bcf86cd799439011
   - By module: ?module_id=507f1f77bcf86cd799439011
   - By date range: ?date_from=2024-01-01T00:00:00.000Z&date_to=2024-12-31T23:59:59.999Z

9. Access Control Rules:
   - Students: Can only access their own data (student_id is ignored)
   - Admins: Must provide student_id to access student data
   - Error: Admin access without student_id returns 400
   - Error: Student trying to access another student's data returns 400
`;

console.log(exampleUsage);

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testStudentAccess,
  testAdminAccess,
  testAdminDetailedAnalytics,
  testErrorCases,
  runAllTests,
};
