import mongoose from 'mongoose';

const LOCAL_MONGODB_URI = 'mongodb://localhost:27017/egrantha';
const MONGODB_URI = process.env.MONGODB_URI || LOCAL_MONGODB_URI;
const EFFECTIVE_MONGODB_URI =
  process.env.NODE_ENV !== 'production' && MONGODB_URI.startsWith('mongodb+srv://')
    ? LOCAL_MONGODB_URI
    : MONGODB_URI;

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
    };

    cached.promise = mongoose
      .connect(EFFECTIVE_MONGODB_URI, opts)
      .catch(async (error) => {
        const canUseLocalFallback =
          EFFECTIVE_MONGODB_URI !== LOCAL_MONGODB_URI &&
          ["ENOTFOUND", "ENODATA", "ETIMEOUT", "ESERVFAIL"].includes(
            error?.code
          );

        if (!canUseLocalFallback) {
          throw error;
        }

        console.warn(
          `MongoDB primary connection failed (${error.code}). Falling back to local MongoDB.`
        );
        return mongoose.connect(LOCAL_MONGODB_URI, opts);
      })
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

  return cached.conn;
}

export default connectDB;
