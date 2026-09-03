import { Prisma } from "@prisma/client";
import { AppError } from "../errors/AppError.js";
import { HTTP_STATUS, ERROR_CODES } from "../constants/index.js";
import { isProd } from "../config/env.js";
import { logger } from "../config/logger.js";

/**
 * Translate Prisma-specific errors into AppError so responses stay consistent
 * and internal implementation details never leak to clients.
 */
const mapPrismaError = (err) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        return new AppError("Duplicate value", {
          status: HTTP_STATUS.CONFLICT,
          code: ERROR_CODES.CONFLICT,
          details: { target: err.meta?.target },
        });
      case "P2025":
        return new AppError("Resource not found", {
          status: HTTP_STATUS.NOT_FOUND,
          code: ERROR_CODES.NOT_FOUND,
        });
      default:
        return new AppError("Database error", {
          status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
          code: ERROR_CODES.INTERNAL,
        });
    }
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    return new AppError("Invalid database query", {
      status: HTTP_STATUS.BAD_REQUEST,
      code: ERROR_CODES.VALIDATION,
    });
  }
  return null;
};

// Express requires 4 params to recognize error middleware.
// eslint-disable-next-line no-unused-vars
export const errorMiddleware = (err, req, res, _next) => {
  const mapped = mapPrismaError(err) ?? (err instanceof AppError ? err : null);
  const originalStatus = Number.isInteger(err?.status) ? err.status : null;

  const finalErr =
    mapped ??
    (originalStatus
      ? new AppError(err.message || "Internal server error", {
          status: originalStatus,
          code: ERROR_CODES.INTERNAL,
        })
      : new AppError("Internal server error", {
          status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
          code: ERROR_CODES.INTERNAL,
        }));

  const logPayload = {
    err: { message: err.message, stack: err.stack, name: err.name },
    method: req.method,
    url: req.originalUrl,
    userId: req.user?.id,
  };
  if (finalErr.status >= 500)
    logger.error(logPayload, "Unhandled server error");
  else logger.warn(logPayload, "Handled request error");

  res.status(finalErr.status).json({
    success: false,
    message: finalErr.message,
    code: finalErr.code,
    ...(finalErr.details ? { details: finalErr.details } : {}),
    ...(isProd ? {} : { stack: err.stack }),
  });
};
