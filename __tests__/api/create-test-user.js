// scripts/create-test-user.js
// Run this to create a test user for testing: node scripts/create-test-user.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// Simple User schema (matches your model)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  companyId: { type: String, required: true },
  companyName: { type: String, required: true },
  role: { type: String, enum: ['admin', 'staff'], default: 'admin' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function createTestUser() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!');

    const testEmail = 'test@example.com';
    const testPassword = 'TestPassword123!';

    // Check if user already exists
    const existing = await User.findOne({ email: testEmail });
    if (existing) {
      console.log('⚠️  Test user already exists');
      console.log('📧 Email:', testEmail);
      console.log('🔑 Password:', testPassword);
      await mongoose.disconnect();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    // Create test user
    const testUser = await User.create({
      email: testEmail,
      password: hashedPassword,
      companyId: 'test-company-' + Date.now(),
      companyName: 'Test Company',
      role: 'admin'
    });

    console.log('✅ Test user created successfully!');
    console.log('📧 Email:', testEmail);
    console.log('🔑 Password:', testPassword);
    console.log('🆔 User ID:', testUser._id);
    console.log('🏢 Company:', testUser.companyName);

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    process.exit(1);
  }
}

createTestUser();