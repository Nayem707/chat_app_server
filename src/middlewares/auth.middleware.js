import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { authService } from "../modules/auth/auth.service.js";
import { userRepository } from "../modules/user/user.repository.js";
import { UnauthenticatedError } from "../errors/AppError.js";
import { ERROR_CODES, COOKIE_NAMES } from "../constants/index.js";

export const authenticate = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.[COOKIE_NAMES.ACCESS_TOKEN];
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : cookieToken;

  if (!token) {
    throw new UnauthenticatedError(
      "Authentication required.",
      ERROR_CODES.AUTH_UNAUTHENTICATED,
    );
  }

  const payload = verifyAccessToken(token);

  if (authService.isTokenRevoked(payload.jti)) {
    throw new UnauthenticatedError(
      "Token has been revoked.",
      ERROR_CODES.AUTH_TOKEN_INVALID,
    );
  }

  const user = await userRepository.findById(payload.sub);
  if (!user) {
    throw new UnauthenticatedError(
      "Authentication required.",
      ERROR_CODES.AUTH_UNAUTHENTICATED,
    );
  }

  req.user = {
    ...user,
    id: user.id ?? user._id?.toString?.(),
  };
  req.tokenPayload = payload;
  next();
});
