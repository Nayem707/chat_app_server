import { PrismaClient } from "@prisma/client";
import { env, isProd } from "./env.js";
import { logger } from "./logger.js";

/**
 * Single PrismaClient instance for the whole process.
 * Prisma manages its own connection pool; do not instantiate more than one.
 */
export const prisma = new PrismaClient({
  log: isProd ? ["warn", "error"] : ["warn", "error"],
  datasources: { db: { url: env.DATABASE_URL } },
});

export async function connectDatabase() {
  await prisma.$connect();
  console.log("\uD83C\uDF89 Database connected");
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
  logger.info("Database disconnected");
}
