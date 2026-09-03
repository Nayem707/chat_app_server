import mongoose from "mongoose";
import { env, isProd } from "./env.js";
import { logger } from "./logger.js";

export async function connectDatabase() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.DATABASE_URL, {
    autoIndex: true,
    serverSelectionTimeoutMS: 5000,
  });
  logger.info("Database connected");
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  logger.info("Database disconnected");
}

export const prisma = null;

if (isProd) {
  mongoose.set("debug", false);
} else {
  mongoose.set("debug", false);
}
