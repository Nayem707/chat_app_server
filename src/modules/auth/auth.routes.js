import { Router } from "express";
import { authController } from "./auth.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

export const authRoutes = Router();

authRoutes.post("/register", authController.register);
authRoutes.post("/login", authController.login);
authRoutes.post("/logout", authenticate, authController.logout);
authRoutes.get("/me", authenticate, authController.me);

export const authRouter = authRoutes;
