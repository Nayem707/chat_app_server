import { authService } from "./auth.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { env } from "../../config/env.js";
import { COOKIE_NAMES } from "../../constants/index.js";

const cookieOptions = {
  httpOnly: true,
  sameSite: env.COOKIE_SAMESITE,
  secure: env.COOKIE_SECURE,
  path: "/",
  domain: env.COOKIE_DOMAIN || undefined,
  maxAge: 15 * 60 * 1000,
};

export const authController = {
  register: asyncHandler(async (req, res) => {
    const payload = await authService.register(req.body || {});
    res.cookie(COOKIE_NAMES.ACCESS_TOKEN, payload.accessToken, cookieOptions);
    res.status(201).json({ success: true, data: payload });
  }),

  login: asyncHandler(async (req, res) => {
    const payload = await authService.login(req.body || {});
    res.cookie(COOKIE_NAMES.ACCESS_TOKEN, payload.accessToken, cookieOptions);
    res.json({ success: true, data: payload });
  }),

  logout: asyncHandler(async (req, res) => {
    authService.revokeToken(req.tokenPayload.jti);
    res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, { path: "/" });
    res.json({ success: true, data: { message: "Logged out." } });
  }),

  me: asyncHandler(async (req, res) => {
    const payload = await authService.me(req.user);
    res.json({ success: true, data: payload });
  }),
};
