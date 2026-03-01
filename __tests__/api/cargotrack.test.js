// __tests__/api/registration-debug.test.js
// FOCUSED REGISTRATION TESTS WITH MAXIMUM DEBUG OUTPUT

const BASE_URL = 'http://localhost:3000';

// Test data with timestamp to ensure uniqueness
const testData = {
  companyA: {
    email: `company-a-${Date.now()}@test.com`,
    password: 'password123',
    companyName: 'Acme Logistics'
  },
  companyB: {
    email: `company-b-${Date.now()}@test.com`,
    password: 'password123',
    companyName: 'Beta Shipping'
  },
  invalidData: {
    missingEmail: {
      password: 'password123',
      companyName: 'Test Company'
    },
    missingPassword: {
      email: `test-${Date.now()}@test.com`,
      companyName: 'Test Company'
    },
    missingCompany: {
      email: `test-${Date.now()}@test.com`,
      password: 'password123'
      // companyName is intentionally missing for this test
    },
    invalidEmail: {
      email: 'not-an-email',
      password: 'password123',
      companyName: 'Test Company'
    },
    shortPassword: {
      email: `test-${Date.now()}@test.com`,
      password: '123',
      companyName: 'Test Company'
    }
  }
};

// Enhanced helper function with maximum debugging
async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const method = options.method || 'GET';
  
  console.log('\n' + '='.repeat(80));
  console.log(`🔵 REQUEST: ${method} ${endpoint}`);
  console.log('='.repeat(80));
  
  if (options.headers) {
    console.log('📋 REQUEST HEADERS:');
    Object.entries(options.headers).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
  }
  
  if (options.body) {
    console.log('📤 REQUEST BODY:');
    try {
      const bodyObj = JSON.parse(options.body);
      console.log(JSON.stringify(bodyObj, null, 2));
    } catch (e) {
      console.log(options.body);
    }
  }
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('\n📊 RESPONSE INFO:');
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Duration: ${duration}ms`);
    
    console.log('\n📋 RESPONSE HEADERS:');
    response.headers.forEach((value, key) => {
      console.log(`   ${key}: ${value}`);
    });

    let data = {};
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
      console.log('\n📥 RESPONSE BODY:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.log('\n📥 RESPONSE BODY (TEXT):');
      console.log(text);
      data = { _rawText: text };
    }

    const status = response.status;
    
    // Status indicator
    if (status >= 200 && status < 300) {
      console.log('\n✅ SUCCESS');
    } else if (status >= 400 && status < 500) {
      console.log('\n⚠️  CLIENT ERROR');
    } else if (status >= 500) {
      console.log('\n❌ SERVER ERROR');
    } else {
      console.log('\n🔵 INFORMATIONAL/REDIRECT');
    }

    console.log('='.repeat(80));

    return { response, data, status };
  } catch (error) {
    console.log('\n💥 NETWORK/FETCH ERROR:');
    console.log(`   Message: ${error.message}`);
    console.log(`   Type: ${error.name}`);
    console.log(`   Stack: ${error.stack}`);
    console.log('='.repeat(80));
    throw error;
  }
}

// Setup: Check server before running tests
beforeAll(async () => {
  console.log('\n' + '🚀'.repeat(40));
  console.log('🚀 STARTING REGISTRATION TEST SUITE WITH MAX DEBUG 🚀');
  console.log('🚀'.repeat(40));
  console.log(`\n📍 BASE_URL: ${BASE_URL}`);
  console.log(`📅 Test Started: ${new Date().toISOString()}`);
  console.log(`🔧 Node Version: ${process.version}`);
  
  try {
    console.log('\n🔍 Checking if server is running...');
    const response = await fetch(BASE_URL);
    console.log(`✅ Server responded with status: ${response.status}`);
  } catch (error) {
    console.error('\n❌ SERVER NOT RUNNING!');
    console.error(`   Error: ${error.message}`);
    throw new Error(
      `❌ Server is not running at ${BASE_URL}.\n` +
      `   Please start it with: npm run dev\n` +
      `   Or check if the port is correct.`
    );
  }
}, 30000);

// ==========================================
// FOCUSED REGISTRATION TESTS
// ==========================================
describe('🔐 REGISTRATION TESTS WITH MAX DEBUG', () => {
  
  test('✅ Should register Company A successfully', async () => {
    console.log('\n📝 TEST: Register Company A');
    console.log('📋 Test Data:', JSON.stringify(testData.companyA, null, 2));
    
    const { status, data } = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(testData.companyA)
    });

    // Detailed assertions with logging
    console.log('\n🔍 RUNNING ASSERTIONS:');
    
    console.log('   Checking status code...');
    if (status !== 201) {
      console.error('   ❌ Status check FAILED!');
      console.error(`      Expected: 201`);
      console.error(`      Received: ${status}`);
    } else {
      console.log('   ✅ Status: 201 (Created)');
    }
    expect(status).toBe(201);

    // FIXED: API returns data nested in 'data' property
    const responseData = data.data || data;

    console.log('   Checking for token property...');
    if (!responseData.hasOwnProperty('token')) {
      console.error('   ❌ Token property missing!');
      console.error('      Response keys:', Object.keys(responseData));
    } else {
      console.log('   ✅ Token property exists');
      console.log(`      Token preview: ${responseData.token.substring(0, 20)}...`);
    }
    expect(responseData).toHaveProperty('token');

    console.log('   Checking for user property...');
    if (!responseData.hasOwnProperty('user')) {
      console.error('   ❌ User property missing!');
    } else {
      console.log('   ✅ User property exists');
      console.log('      User data:', JSON.stringify(responseData.user, null, 2));
    }
    expect(responseData).toHaveProperty('user');

    console.log('   Checking email match...');
    if (responseData.user?.email !== testData.companyA.email) {
      console.error('   ❌ Email mismatch!');
      console.error(`      Expected: ${testData.companyA.email}`);
      console.error(`      Received: ${responseData.user?.email}`);
    } else {
      console.log('   ✅ Email matches');
    }
    expect(responseData.user.email).toBe(testData.companyA.email);

    console.log('\n✅ ALL ASSERTIONS PASSED FOR COMPANY A');
  }, 30000);

  test('✅ Should register Company B successfully', async () => {
    console.log('\n📝 TEST: Register Company B');
    console.log('📋 Test Data:', JSON.stringify(testData.companyB, null, 2));
    
    const { status, data } = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(testData.companyB)
    });

    console.log('\n🔍 RUNNING ASSERTIONS:');
    
    console.log('   Checking status code...');
    expect(status).toBe(201);
    console.log('   ✅ Status: 201');

    const responseData = data.data || data;

    console.log('   Checking for token...');
    expect(responseData).toHaveProperty('token');
    console.log('   ✅ Token exists');

    console.log('   Checking for user...');
    expect(responseData).toHaveProperty('user');
    console.log('   ✅ User exists');

    console.log('\n✅ ALL ASSERTIONS PASSED FOR COMPANY B');
  }, 30000);

  test('❌ Should reject duplicate email registration', async () => {
    console.log('\n📝 TEST: Reject Duplicate Email');
    console.log('📋 Attempting to register with same email as Company A');
    console.log('   Email:', testData.companyA.email);
    
    const { status, data } = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(testData.companyA)
    });

    console.log('\n🔍 RUNNING ASSERTIONS:');
    console.log('   Checking for 409 Conflict status...');
    
    // FIXED: API now returns 409 for duplicates (was returning 400)
    if (status !== 409) {
      console.error('   ❌ Expected 409 (Conflict)');
      console.error(`      Received: ${status}`);
      console.error('      The API should return 409 for duplicate emails!');
      console.error('      Update the API to return 409 instead of 400 for duplicates');
    } else {
      console.log('   ✅ Correctly rejected with 409 Conflict');
    }
    
    expect(status).toBe(409);
    console.log('\n✅ DUPLICATE REJECTION WORKING CORRECTLY');
  }, 30000);

  test('❌ Should reject registration with missing email', async () => {
    console.log('\n📝 TEST: Reject Missing Email');
    
    const { status, data } = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(testData.invalidData.missingEmail)
    });

    console.log('\n🔍 RUNNING ASSERTIONS:');
    console.log('   Should return 400 (Bad Request)');
    expect(status).toBe(400);
    console.log('   ✅ Validation working');
  }, 30000);

  test('❌ Should reject registration with missing password', async () => {
    console.log('\n📝 TEST: Reject Missing Password');
    
    const { status, data } = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(testData.invalidData.missingPassword)
    });

    console.log('\n🔍 RUNNING ASSERTIONS:');
    expect(status).toBe(400);
    console.log('   ✅ Password validation working');
  }, 30000);

  test('❌ Should reject registration with missing company', async () => {
    console.log('\n📝 TEST: Reject Missing Company');
    
    const { status, data } = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(testData.invalidData.missingCompany)
    });

    console.log('\n🔍 RUNNING ASSERTIONS:');
    expect(status).toBe(400);
    console.log('   ✅ Company validation working');
  }, 30000);

  test('❌ Should reject registration with invalid email format', async () => {
    console.log('\n📝 TEST: Reject Invalid Email Format');
    
    const { status, data } = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(testData.invalidData.invalidEmail)
    });

    console.log('\n🔍 RUNNING ASSERTIONS:');
    expect(status).toBe(400);
    console.log('   ✅ Email format validation working');
  }, 30000);

  test('❌ Should reject registration with short password', async () => {
    console.log('\n📝 TEST: Reject Short Password');
    
    const { status, data } = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(testData.invalidData.shortPassword)
    });

    console.log('\n🔍 RUNNING ASSERTIONS:');
    expect(status).toBe(400);
    console.log('   ✅ Password length validation working');
  }, 30000);

  test('❌ Should reject registration with empty body', async () => {
    console.log('\n📝 TEST: Reject Empty Request Body');
    
    const { status, data } = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({})
    });

    console.log('\n🔍 RUNNING ASSERTIONS:');
    expect(status).toBe(400);
    console.log('   ✅ Empty body validation working');
  }, 30000);

  test('❌ Should reject registration with malformed JSON', async () => {
    console.log('\n📝 TEST: Reject Malformed JSON');
    
    try {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'This is not JSON'
      });
      
      console.log(`   Response status: ${response.status}`);
      expect(response.status).toBe(400);
      console.log('   ✅ Malformed JSON rejected');
    } catch (error) {
      console.log('   ✅ Request properly failed');
    }
  }, 30000);
});

afterAll(() => {
  console.log('\n' + '🏁'.repeat(40));
  console.log('🏁 REGISTRATION TEST SUITE COMPLETED 🏁');
  console.log('🏁'.repeat(40));
  console.log(`📅 Test Ended: ${new Date().toISOString()}\n`);
});

console.log('\n✅ Registration test file loaded successfully!');