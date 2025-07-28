// Test script for the optimized module assignment API
// This demonstrates how to use the new manage-assignments endpoint

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';
const AUTH_TOKEN = 'your-jwt-token-here'; // Replace with actual token

// Example data
const moduleId = '507f1f77bcf86cd799439011';
const professorIds = [
  '507f1f77bcf86cd799439012',
  '507f1f77bcf86cd799439013',
  '507f1f77bcf86cd799439014',
];

// Test scenarios
const testScenarios = [
  {
    name: 'Assign New Professors',
    description:
      'Assign professors to a module that has no current assignments',
    professorIds: ['prof1', 'prof2', 'prof3'],
    expectedResult: 'All professors should be assigned',
  },
  {
    name: 'Remove Some Professors',
    description: 'Keep some professors, remove others',
    professorIds: ['prof1', 'prof2'], // Remove prof3
    expectedResult: 'prof1 and prof2 remain, prof3 gets unassigned',
  },
  {
    name: 'Complete Replacement',
    description: 'Replace all current professors with new ones',
    professorIds: ['prof4', 'prof5'],
    expectedResult: 'prof1, prof2, prof3 unassigned; prof4, prof5 assigned',
  },
  {
    name: 'No Changes',
    description: 'Keep the same professors',
    professorIds: ['prof4', 'prof5'], // Same as previous
    expectedResult: 'No changes should occur',
  },
];

// Function to test the API
async function testModuleAssignment(scenario) {
  try {
    console.log(`\n🧪 Testing: ${scenario.name}`);
    console.log(`📝 Description: ${scenario.description}`);
    console.log(`📊 Expected: ${scenario.expectedResult}`);

    const requestData = {
      module_id: moduleId,
      professor_ids: scenario.professorIds,
      school_id: '507f1f77bcf86cd799439015', // Optional for super admin
    };

    console.log('\n📤 Request:');
    console.log(JSON.stringify(requestData, null, 2));

    const response = await axios.post(
      `${BASE_URL}/modules/manage-assignments-optimized`,
      requestData,
      {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('\n📥 Response:');
    console.log(JSON.stringify(response.data, null, 2));

    // Analyze results
    const { data } = response.data;
    console.log('\n📈 Summary:');
    console.log(`✅ Assigned: ${data.summary.total_assigned}`);
    console.log(`❌ Unassigned: ${data.summary.total_unassigned}`);
    console.log(`➡️ Unchanged: ${data.summary.total_unchanged}`);
    console.log(`📊 Total Processed: ${data.summary.total_processed}`);

    return response.data;
  } catch (error) {
    console.error(
      `❌ Error in ${scenario.name}:`,
      error.response?.data || error.message,
    );
    return null;
  }
}

// Function to run all tests
async function runAllTests() {
  console.log('🚀 Starting Module Assignment API Tests');
  console.log('=====================================');

  for (const scenario of testScenarios) {
    await testModuleAssignment(scenario);

    // Wait a bit between tests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log('\n✅ All tests completed!');
}

// Function to test performance comparison
async function testPerformanceComparison() {
  console.log('\n⚡ Performance Comparison Test');
  console.log('==============================');

  const largeProfessorList = Array.from(
    { length: 50 },
    (_, i) => `prof${i + 1}`,
  );

  const testData = {
    module_id: moduleId,
    professor_ids: largeProfessorList,
    school_id: '507f1f77bcf86cd799439015',
  };

  // Test standard version
  console.log('\n📊 Testing Standard Version...');
  const startStandard = Date.now();
  try {
    await axios.post(`${BASE_URL}/modules/manage-assignments`, testData, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    const standardTime = Date.now() - startStandard;
    console.log(`⏱️ Standard Version Time: ${standardTime}ms`);
  } catch (error) {
    console.log('❌ Standard version failed:', error.response?.data?.message);
  }

  // Test optimized version
  console.log('\n📊 Testing Optimized Version...');
  const startOptimized = Date.now();
  try {
    await axios.post(
      `${BASE_URL}/modules/manage-assignments-optimized`,
      testData,
      {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
      },
    );
    const optimizedTime = Date.now() - startOptimized;
    console.log(`⏱️ Optimized Version Time: ${optimizedTime}ms`);
  } catch (error) {
    console.log('❌ Optimized version failed:', error.response?.data?.message);
  }
}

// Main execution
if (require.main === module) {
  // Check if AUTH_TOKEN is set
  if (AUTH_TOKEN === 'your-jwt-token-here') {
    console.log('❌ Please set a valid AUTH_TOKEN in the script');
    console.log('💡 You can get a token by logging in to the application');
    process.exit(1);
  }

  // Run tests
  runAllTests()
    .then(() => testPerformanceComparison())
    .catch((error) => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = {
  testModuleAssignment,
  runAllTests,
  testPerformanceComparison,
};
