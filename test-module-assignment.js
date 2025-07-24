/**
 * Test Script for Module-Professor Assignment System
 *
 * This script demonstrates the key functionality of the module-professor assignment system.
 * Run this script to test the API endpoints and verify the implementation.
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api';
const AUTH_TOKEN = 'your_jwt_token_here'; // Replace with actual token

// Headers for authenticated requests
const headers = {
  Authorization: `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json',
};

// Sample data
const SAMPLE_MODULE_ID = '507f1f77bcf86cd799439011';
const SAMPLE_PROFESSOR_IDS = [
  '507f1f77bcf86cd799439012',
  '507f1f77bcf86cd799439013',
];

async function makeRequest(endpoint, options = {}) {
  try {
    const response = await axios({
      url: `${BASE_URL}${endpoint}`,
      method: options.method || 'GET',
      headers: headers,
      data: options.data,
      params: options.params,
    });
    console.log(`✅ ${options.method || 'GET'} ${endpoint}:`, response.data);
    return response.data;
  } catch (error) {
    console.error(
      `❌ ${options.method || 'GET'} ${endpoint}:`,
      error.response?.data || error.message,
    );
    throw error;
  }
}

// Test 1: Assign professors to a module
async function testAssignProfessors() {
  console.log('\n🧪 Test 1: Assigning professors to module');

  const assignmentData = {
    module_id: SAMPLE_MODULE_ID,
    assignments: [
      {
        professor_id: SAMPLE_PROFESSOR_IDS[0],
      },
      {
        professor_id: SAMPLE_PROFESSOR_IDS[1],
      },
    ],
  };

  return await makeRequest('/modules/assign-professors', {
    method: 'POST',
    data: assignmentData,
  });
}

// Test 2: Get module assignments
async function testGetModuleAssignments() {
  console.log('\n🧪 Test 2: Getting module assignments');

  return await makeRequest(`/modules/${SAMPLE_MODULE_ID}/assignments`);
}

// Test 3: Get professor assignments
async function testGetProfessorAssignments() {
  console.log('\n🧪 Test 3: Getting professor assignments');

  return await makeRequest(
    `/professor/${SAMPLE_PROFESSOR_IDS[0]}/assignments`,
    {
      params: { page: 1, limit: 10 },
    },
  );
}

// Test 4: Check professor module access
async function testCheckProfessorAccess() {
  console.log('\n🧪 Test 4: Checking professor module access');

  return await makeRequest(
    `/professor/${SAMPLE_PROFESSOR_IDS[0]}/module-access/${SAMPLE_MODULE_ID}`,
  );
}

// Test 5: Get audit logs
async function testGetAuditLogs() {
  console.log('\n🧪 Test 5: Getting assignment audit logs');

  return await makeRequest('/modules/assignments/audit-logs', {
    params: {
      module_id: SAMPLE_MODULE_ID,
      page: 1,
      limit: 10,
    },
  });
}

// Test 6: Unassign a professor
async function testUnassignProfessor() {
  console.log('\n🧪 Test 6: Unassigning professor from module');

  const unassignmentData = {
    module_id: SAMPLE_MODULE_ID,
    professor_id: SAMPLE_PROFESSOR_IDS[1],
  };

  return await makeRequest('/modules/unassign-professor', {
    method: 'POST',
    data: unassignmentData,
  });
}

// Test 7: Check professor notifications (if endpoint exists)
async function testProfessorNotifications() {
  console.log('\n🧪 Test 7: Checking professor notifications');

  try {
    // This would be a new endpoint for professor notifications
    return await makeRequest(
      `/professor/${SAMPLE_PROFESSOR_IDS[0]}/notifications`,
      {
        params: { page: 1, limit: 10 },
      },
    );
  } catch (error) {
    console.log('⚠️ Professor notifications endpoint not implemented yet');
    return { message: 'Professor notifications endpoint not available' };
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting Module-Professor Assignment Tests\n');

  try {
    await testAssignProfessors();
    await testGetModuleAssignments();
    await testGetProfessorAssignments();
    await testCheckProfessorAccess();
    await testGetAuditLogs();
    await testUnassignProfessor();
    await testProfessorNotifications();

    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  testAssignProfessors,
  testGetModuleAssignments,
  testGetProfessorAssignments,
  testCheckProfessorAccess,
  testGetAuditLogs,
  testUnassignProfessor,
  testProfessorNotifications,
  runTests,
};
