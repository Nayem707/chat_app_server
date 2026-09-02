/**
 * MongoDB-specific indexes that Prisma cannot express natively.
 * Idempotent: safe to call on every startup or as a one-shot script.
 *
 * Run:  node prisma/mongo-indexes.js
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ensureIndexes = async () => {
  // Text index on Message.content for message search.
  await prisma.$runCommandRaw({
    createIndexes: 'Message',
    indexes: [
      {
        key: { content: 'text' },
        name: 'Message_content_text',
        default_language: 'english',
      },
    ],
  });
};

const main = async () => {
  await ensureIndexes();
  // eslint-disable-next-line no-console
  console.log('MongoDB indexes ensured');
};

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
