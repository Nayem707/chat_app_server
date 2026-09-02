import { NotFoundError } from '../errors/AppError.js';

export const notFoundMiddleware = (req, _res, next) => {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
};
