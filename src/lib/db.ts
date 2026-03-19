import mongoose from 'mongoose';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

const options = {
  bufferCommands: false,
  maxPoolSize: 10,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4,
};

// ─── DEBUG LISTENERS (attach once) ───────────────────────────────────────────
let listenersAttached = false;

function attachDebugListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('connecting', () =>
    console.log('🔌 [DB] Connecting to MongoDB...')
  );

  mongoose.connection.on('connected', () =>
    console.log('✅ [DB] Connected to MongoDB successfully')
  );

  mongoose.connection.on('disconnected', () =>
    console.warn('⚠️  [DB] MongoDB disconnected')
  );

  mongoose.connection.on('reconnected', () =>
    console.log('🔁 [DB] MongoDB reconnected')
  );

  mongoose.connection.on('error', (err) => {
    console.error('❌ [DB] Mongoose connection error:', err.message);

    // ── Decode the most common Atlas errors ──
    if (err.message.includes('IP') || err.message.includes('whitelist') || err.message.includes('ECONNREFUSED')) {
      console.error('🚫 [DB] LIKELY CAUSE: Your IP is not whitelisted in MongoDB Atlas.');
      console.error('   → Go to: https://cloud.mongodb.com');
      console.error('   → Cluster → Network Access → Add IP Address → 0.0.0.0/0');
      console.error('   → Wait ~2 minutes for propagation, then retry.');
    }

    if (err.message.includes('Authentication failed') || err.message.includes('bad auth')) {
      console.error('🔑 [DB] LIKELY CAUSE: Wrong username or password in MONGODB_URI.');
    }

    if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
      console.error('🌐 [DB] LIKELY CAUSE: DNS resolution failed — check your MONGODB_URI hostname.');
    }
  });
}
// ─────────────────────────────────────────────────────────────────────────────

async function dbConnect() {
  const MONGODB_URI = process.env.MONGODB_URI;

  // ── 1. Validate env var ──
  if (!MONGODB_URI) {
    console.error('❌ [DB] MONGODB_URI is missing from environment variables!');
    console.error('   → Make sure .env.local exists and has MONGODB_URI set.');
    throw new Error('Please define MONGODB_URI in .env.local');
  }

  // ── 2. Redact password for safe logging ──
  const safeUri = MONGODB_URI.replace(/:([^@]+)@/, ':<REDACTED>@');
  console.log(`🔍 [DB] MONGODB_URI (redacted): ${safeUri}`);

  // ── 3. Return cached connection if alive ──
  if (cached.conn) {
    const state = mongoose.connection.readyState;
    // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    const stateLabel = ['disconnected', 'connected', 'connecting', 'disconnecting'][state] ?? 'unknown';
    console.log(`♻️  [DB] Using cached connection (state: ${stateLabel})`);

    if (state === 1) return cached.conn;

    // Cached but not actually connected — reset and reconnect
    console.warn('⚠️  [DB] Cached connection is stale, resetting...');
    cached.conn = null;
    cached.promise = null;
  }

  attachDebugListeners();

  // ── 4. Connect ──
  if (!cached.promise) {
    console.log('🚀 [DB] Creating new MongoDB connection...');
    console.log(`   serverSelectionTimeoutMS: ${options.serverSelectionTimeoutMS}ms`);
    cached.promise = mongoose.connect(MONGODB_URI, options);
  }

  try {
    const startTime = Date.now();
    cached.conn = await cached.promise;
    const elapsed = Date.now() - startTime;
    console.log(`✅ [DB] MongoDB connected in ${elapsed}ms`);
    console.log(`   Host: ${mongoose.connection.host}`);
    console.log(`   DB:   ${mongoose.connection.name}`);
  } catch (e: any) {
    cached.promise = null;
    cached.conn = null;

    console.error('💥 [DB] Failed to connect to MongoDB!');
    console.error(`   Error type: ${e.constructor?.name}`);
    console.error(`   Message:    ${e.message}`);

    // ── Atlas-specific guidance ──
    if (e.message?.includes('Could not connect to any servers') || e.message?.includes('ReplicaSetNoPrimary')) {
      console.error('');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('🚫 ATLAS NETWORK BLOCK DETECTED — checklist:');
      console.error('');
      console.error('  1. Go to https://cloud.mongodb.com → your project');
      console.error('     (make sure you are in the RIGHT project/org)');
      console.error('  2. Left sidebar → Security → Network Access');
      console.error('  3. Click "Add IP Address" → "Allow Access From Anywhere" (0.0.0.0/0)');
      console.error('  4. Wait ~2 minutes for Atlas to propagate the rule');
      console.error('  5. Also verify: Security → Database Access → your user exists');
      console.error('     and has readWriteAnyDatabase or access to cargo-tracker');
      console.error('');
      console.error('  If running in Docker/container: your container\'s outbound IP');
      console.error('  may differ from your host machine IP. 0.0.0.0/0 fixes this.');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('');
    }

    throw e;
  }

  return cached.conn;
}

export default dbConnect;