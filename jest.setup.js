// jest.setup.js
// This file runs before each test suite

// ============================================
// TEST TIMEOUT CONFIGURATION
// ============================================
// Set test timeout to 30 seconds (API tests can be slow)
jest.setTimeout(30000);

// ============================================
// ENVIRONMENT VARIABLES FOR TESTING
// ============================================
// Mock environment variables for test environment
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cargo-track-test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only-minimum-32-chars';
process.env.NODE_ENV = 'test';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

// ============================================
// GLOBAL TEST UTILITIES
// ============================================
// Add any global test utilities here
global.testUtils = {
  // Example: Create a mock user for tests
  mockUser: {
    _id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    name: 'Test User',
    company: 'Test Company',
    role: 'admin',
  },
  
  // Example: Create a mock shipment
  mockShipment: {
    _id: '507f1f77bcf86cd799439012',
    trackingNumber: 'TEST-123456',
    origin: 'Shanghai',
    destination: 'New York',
    status: 'in_transit',
  },
};

// ============================================
// CLEANUP AFTER TESTS
// ============================================
// Clean up after each test
afterEach(() => {
  // Clear all mocks after each test
  jest.clearAllMocks();
});

// ============================================
// FETCH FOR API TESTS
// ============================================
// Use real fetch from node-fetch for API testing
global.fetch = require('node-fetch');

console.log('✅ Jest setup complete - Test environment ready');