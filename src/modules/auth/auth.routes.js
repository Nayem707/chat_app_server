import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { signAccessToken } from "../../utils/jwt.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { appStore } from "../store.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body || {};
    const user = await appStore.registerUser({ name, email, password });
    const accessToken = signAccessToken(user.id);
    res.status(201).json({
      success: true,
      data: {
        accessToken,
        user: appStore.sanitizeUser(user),
        message: "Registration successful.",
      },
    });
  }),
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    const user = await appStore.loginUser({ email, password });
    const accessToken = signAccessToken(user.id);
    res.json({
      success: true,
      data: {
        accessToken,
        user: appStore.sanitizeUser(user),
        message: "Login successful.",
      },
    });
  }),
);

// Revokes the token's JTI so it cannot be reused before natural expiry.
authRouter.post(
  "/logout",
  authenticate,
  asyncHandler(async (req, res) => {
    appStore.revokeToken(req.tokenPayload.jti);
    res.json({ success: true, data: { message: "Logged out." } });
  }),
);

authRouter.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: appStore.sanitizeUser(req.user) });
  }),
);
