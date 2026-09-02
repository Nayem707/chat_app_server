import { Router } from 'express';
import { prisma } from '../../config/database.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/httpResponse.js';

export const healthRouter = Router();

healthRouter.get(
  '/live',
  asyncHandler(async (_req, res) => ok(res, { status: 'live' })),
);

healthRouter.get(
  '/ready',
  asyncHandler(async (_req, res) => {
    // Cheap db round-trip to verify Prisma connectivity.
    await prisma.$runCommandRaw({ ping: 1 });
    ok(res, { status: 'ready', db: 'ok' });
  }),
);
