import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (!MONGODB_URI) {
  // Intentionally throw at import time to fail fast in serverless
  throw new Error("MONGODB_URI is not set in environment variables");
}

type MongooseGlobal = typeof global & {
  _mongooseConn?: typeof mongoose | null;
  _mongoosePromise?: Promise<typeof mongoose> | null;
};

const globalForMongoose = global as MongooseGlobal;

export async function connectToDatabase() {
  if (globalForMongoose._mongooseConn) {
    return globalForMongoose._mongooseConn;
  }

  if (!globalForMongoose._mongoosePromise) {
    globalForMongoose._mongoosePromise = mongoose
      .connect(MONGODB_URI, {
        dbName: process.env.MONGODB_DB || undefined,
      })
      .then((m) => m);
  }

  globalForMongoose._mongooseConn = await globalForMongoose._mongoosePromise;
  return globalForMongoose._mongooseConn;
}
