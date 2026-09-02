import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { appStore } from "../modules/store.js";
import { UnauthenticatedError } from "../errors/AppError.js";
import { ERROR_CODES } from "../constants/index.js";

export const authenticate = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthenticatedError(
      "Authentication required.",
      ERROR_CODES.AUTH_UNAUTHENTICATED,
    );
  }

  const token = authHeader.slice(7);
  const payload = verifyAccessToken(token); // throws UnauthenticatedError on bad/expired token

  if (appStore.isTokenRevoked(payload.jti)) {
    throw new UnauthenticatedError(
      "Token has been revoked.",
      ERROR_CODES.AUTH_TOKEN_INVALID,
    );
  }

  const user = appStore.state.users.find((u) => u.id === payload.sub);
  if (!user) {
    throw new UnauthenticatedError(
      "Authentication required.",
      ERROR_CODES.AUTH_UNAUTHENTICATED,
    );
  }

  req.user = user;
  req.tokenPayload = payload;
  next();
});
