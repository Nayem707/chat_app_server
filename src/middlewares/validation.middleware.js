import { ZodError } from 'zod';
import { ValidationError } from '../errors/AppError.js';

/**
 * Validate a section of the request (body/query/params) with a Zod schema.
 * Replaces the section with the parsed/sanitized value.
 */
export const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    try {
      req[source] = schema.parse(req[source]);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        }));
        return next(new ValidationError('Invalid request payload', details));
      }
      next(err);
    }
  };
