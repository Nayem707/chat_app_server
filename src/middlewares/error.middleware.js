import mongoose from "mongoose";
import { AppError } from "../errors/AppError.js";
import { HTTP_STATUS, ERROR_CODES } from "../constants/index.js";
import { isProd } from "../config/env.js";
import { logger } from "../config/logger.js";

const mapMongoError = (err) => {
  if (err instanceof mongoose.Error.ValidationError) {
    return new AppError("Validation failed", {
      status: HTTP_STATUS.BAD_REQUEST,
      code: ERROR_CODES.VALIDATION,
      details: Object.fromEntries(
        Object.entries(err.errors || {}).map(([key, value]) => [
          key,
          value.message,
        ]),
      ),
    });
  }

  if (err instanceof mongoose.Error.CastError) {
    return new AppError("Invalid identifier provided.", {
      status: HTTP_STATUS.BAD_REQUEST,
      code: ERROR_CODES.VALIDATION,
      details: { field: err.path, value: err.value },
    });
  }

  if (err?.code === 11000) {
    return new AppError("Duplicate value", {
      status: HTTP_STATUS.CONFLICT,
      code: ERROR_CODES.CONFLICT,
      details: { keyPattern: err.keyPattern },
    });
  }

  return null;
};

// Express requires 4 params to recognize error middleware.
// eslint-disable-next-line no-unused-vars
export const errorMiddleware = (err, req, res, _next) => {
  const mapped = mapMongoError(err) ?? (err instanceof AppError ? err : null);
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
