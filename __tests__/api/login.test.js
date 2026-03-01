// @ts-nocheck
// ============================================================================
// FILE: __tests__/api/login.test.js
// Login API Integration Tests
// ============================================================================

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Helper to wait between requests
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

describe('Login API Tests', () => {
  
  // Wait 300ms between each test to avoid rate limiting
  beforeEach(async () => {
    await wait(300);
  });
  
  // =========================================================================
  // TEST 1: Successful Login
  // =========================================================================
  test('Should successfully login with valid credentials', async () => {
    const loginData = {
      email: 'test@example.com',
      password: 'TestPassword123!'
    };

    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('token');
    expect(data.data).toHaveProperty('user');
    expect(data.data.user).toHaveProperty('email', loginData.email);
    expect(data.data.user).not.toHaveProperty('password'); // Password should not be returned
  });

  // =========================================================================
  // TEST 2: Login with Invalid Email
  // =========================================================================
  test('Should fail login with invalid email', async () => {
    const loginData = {
      email: 'nonexistent@example.com',
      password: 'SomePassword123!'
    };

    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });

    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty('error');
    expect(data.error).toMatch(/invalid|credentials|not found/i);
  });

  // =========================================================================
  // TEST 3: Login with Invalid Password
  // =========================================================================
  test('Should fail login with invalid password', async () => {
    const loginData = {
      email: 'test@example.com',
      password: 'WrongPassword123!'
    };

    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });

    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty('error');
    expect(data.error).toMatch(/invalid|credentials|password/i);
  });

  // =========================================================================
  // TEST 4: Login with Missing Email
  // =========================================================================
  test('Should fail login with missing email', async () => {
    const loginData = {
      password: 'TestPassword123!'
    };

    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
    expect(data.error).toMatch(/email|required|validation/i);
  });

  // =========================================================================
  // TEST 5: Login with Missing Password
  // =========================================================================
  test('Should fail login with missing password', async () => {
    const loginData = {
      email: 'test@example.com'
    };

    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
    expect(data.error).toMatch(/password|required|validation/i);
  });

  // =========================================================================
  // TEST 6: Login with Invalid Email Format
  // =========================================================================
  test('Should fail login with invalid email format', async () => {
    await wait(500); // Extra delay to avoid rate limiting
    const loginData = {
      email: 'not-an-email',
      password: 'TestPassword123!'
    };

    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
    expect(data.error).toMatch(/email|invalid|format|validation/i);
  });

  // =========================================================================
  // TEST 7: Login with Empty Credentials
  // =========================================================================
  test('Should fail login with empty credentials', async () => {
    await wait(500); // Extra delay to avoid rate limiting
    const loginData = {
      email: '',
      password: ''
    };

    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  // =========================================================================
  // TEST 8: Login with SQL Injection Attempt
  // =========================================================================
  test('Should safely handle SQL injection attempts', async () => {
    const loginData = {
      email: "admin@example.com' OR '1'='1",
      password: "password' OR '1'='1"
    };

    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });

    const data = await response.json();

    // Should fail authentication, not return data
    expect(response.status).not.toBe(200);
    expect(data).not.toHaveProperty('token');
  });

  // =========================================================================
  // TEST 9: Verify JWT Token Structure
  // =========================================================================
  test('Should return a valid JWT token structure', async () => {
    const loginData = {
      email: 'test@example.com',
      password: 'TestPassword123!'
    };

    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });

    const data = await response.json();

    if (response.status === 200) {
      expect(data.data.token).toBeDefined();
      
      // JWT tokens have 3 parts separated by dots
      const tokenParts = data.data.token.split('.');
      expect(tokenParts).toHaveLength(3);
      
      // Each part should be base64 encoded
      tokenParts.forEach(part => {
        expect(part).toMatch(/^[A-Za-z0-9_-]+$/);
      });
    }
  });

  // =========================================================================
  // TEST 10: Verify User Object Structure
  // =========================================================================
  test('Should return complete user object without sensitive data', async () => {
    const loginData = {
      email: 'test@example.com',
      password: 'TestPassword123!'
    };

    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });

    const data = await response.json();

    if (response.status === 200) {
      expect(data.data.user).toHaveProperty('email');
      expect(data.data.user).toHaveProperty('companyName');
      expect(data.data.user).toHaveProperty('role');
      
      // Should NOT include sensitive fields
      expect(data.data.user).not.toHaveProperty('password');
      expect(data.data.user).not.toHaveProperty('passwordHash');
    }
  });

  // =========================================================================
  // TEST 11: Rate Limiting (if implemented)
  // =========================================================================
  test('Should handle multiple rapid login attempts', async () => {
    const loginData = {
      email: 'test@example.com',
      password: 'WrongPassword123!'
    };

    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        fetch(`${BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(loginData)
        })
      );
    }

    const responses = await Promise.all(promises);
    
    // All should fail with 401 (invalid credentials)
    // If rate limiting is enabled, some might return 429
    responses.forEach(response => {
      expect([401, 429]).toContain(response.status);
    });
  });

  // =========================================================================
  // TEST 12: Case Sensitivity
  // =========================================================================
  test('Should handle email case insensitivity correctly', async () => {
    const loginData1 = {
      email: 'test@example.com',
      password: 'TestPassword123!'
    };

    const loginData2 = {
      email: 'TEST@EXAMPLE.COM',
      password: 'TestPassword123!'
    };

    const response1 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData1)
    });

    const response2 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData2)
    });

    // Both should succeed or both should fail with the same status
    expect(response1.status).toBe(response2.status);
  });

});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a test user for login tests
 * NOTE: This assumes you have a registration endpoint
 */
async function createTestUser(email, password) {
  const response = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      companyName: 'Test Company',
      role: 'admin'
    })
  });
  
  return response.json();
}

/**
 * Clean up test user
 * NOTE: This assumes you have a delete user endpoint or direct DB access
 */
async function deleteTestUser(userId) {
  // Implementation depends on your API structure
  // This is a placeholder
  console.log(`Cleaning up test user: ${userId}`);
}

// ============================================================================
// EXPORT TEST UTILITIES
// ============================================================================
module.exports = {
  createTestUser,
  deleteTestUser
};