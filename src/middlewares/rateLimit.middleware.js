import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { RateLimitError } from '../errors/AppError.js';

/**
 * Global limiter — cheap protection against generic abuse.
 * Auth endpoints get a stricter limiter (added in Phase 2).
 */
export const globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) => next(new RateLimitError()),
});
