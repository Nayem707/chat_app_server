import { Router } from 'express';
import { healthRouter } from '../modules/health/health.routes.js';

/**
 * Single mount point for all versioned API routes.
 * Module routers are registered here — feature code stays in `modules/*`.
 */
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);

// Auth, users, conversations, messages, groups — added in later phases.
