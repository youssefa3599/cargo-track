// jest.env.js - Set environment variables before tests run

process.env.NODE_ENV = 'test';
process.env.DISABLE_RATE_LIMIT = 'true';
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';

console.log('🧪 Test environment configured:');
console.log('   - NODE_ENV:', process.env.NODE_ENV);
console.log('   - DISABLE_RATE_LIMIT:', process.env.DISABLE_RATE_LIMIT);
console.log('   - API URL:', process.env.NEXT_PUBLIC_API_URL);