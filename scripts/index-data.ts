// scripts/index-data.ts
// Load env vars FIRST using require (works with tsx)
require('dotenv').config({ path: '.env.local' });

// Now import everything else
import mongoose from 'mongoose';
import { bulkIndexAllData } from '../src/lib/services/indexer';

async function main() {
  try {
    console.log('🚀 Starting data indexing...\n');

    // Debug: Show what env vars are loaded
    console.log('Environment check:');
    console.log('- MONGODB_URI:', process.env.MONGODB_URI ? '✓ Found' : '✗ Missing');
    console.log('- PINECONE_API_KEY:', process.env.PINECONE_API_KEY ? '✓ Found' : '✗ Missing');
    console.log('- GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✓ Found' : '✗ Missing\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Run bulk indexing
    await bulkIndexAllData();

    console.log('\n✅ Indexing complete!');
    console.log('🎉 All data has been indexed to Pinecone\n');

  } catch (error: any) {
    console.error('\n❌ Indexing failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
    process.exit(0);
  }
}

main();