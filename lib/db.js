import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      // Pool tuning: the default maxPoolSize of 100 is far too high for
      // serverless (each instance would try to hold up to 100 connections).
      // Keep a small warm pool so requests reuse connections instead of paying
      // the ~2s TLS+auth handshake each time, and cap the ceiling.
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 60000,
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongoose) => {
        return mongoose;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  // Auto-seed the default super admin once per server process, after the
  // connection is established. Cached on global so it runs at most once even
  // across hot reloads and concurrent requests.
  if (!global.__superAdminSeed) {
    global.__superAdminSeed = (async () => {
      try {
        const { default: ensureSuperAdmin } = await import("@/lib/seedSuperAdmin");
        await ensureSuperAdmin();
      } catch (e) {
        console.error("[seed] ensureSuperAdmin error:", e.message);
      }
    })();
  }
  await global.__superAdminSeed;

  return cached.conn;
}

export default connectDB;
