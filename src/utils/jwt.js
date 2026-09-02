import jwt from "jsonwebtoken";
import crypto from "node:crypto";

import { env } from "../config/env.js";
import { ERROR_CODES } from "../constants/index.js";
import { UnauthenticatedError } from "../errors/AppError.js";

export const signAccessToken = (userId) =>
  jwt.sign({ sub: userId, jti: crypto.randomUUID() }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new UnauthenticatedError(
        "Token has expired.",
        ERROR_CODES.AUTH_TOKEN_EXPIRED,
      );
    }
    throw new UnauthenticatedError(
      "Invalid token.",
      ERROR_CODES.AUTH_TOKEN_INVALID,
    );
  }
};
