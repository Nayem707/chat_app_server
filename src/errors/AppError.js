import { HTTP_STATUS, ERROR_CODES } from '../constants/index.js';

/**
 * Base class for all expected/operational errors.
 * Anything else bubbling up is treated as an unexpected internal error.
 */
export class AppError extends Error {
  constructor(
    message,
    { status = HTTP_STATUS.INTERNAL_SERVER_ERROR, code = ERROR_CODES.INTERNAL, details } = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details) {
    super(message, {
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      code: ERROR_CODES.VALIDATION,
      details,
    });
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'Authentication required', code = ERROR_CODES.AUTH_UNAUTHENTICATED) {
    super(message, { status: HTTP_STATUS.UNAUTHORIZED, code });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, { status: HTTP_STATUS.FORBIDDEN, code: ERROR_CODES.FORBIDDEN });
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, { status: HTTP_STATUS.NOT_FOUND, code: ERROR_CODES.NOT_FOUND });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, { status: HTTP_STATUS.CONFLICT, code: ERROR_CODES.CONFLICT });
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, { status: HTTP_STATUS.TOO_MANY_REQUESTS, code: ERROR_CODES.RATE_LIMITED });
  }
}
