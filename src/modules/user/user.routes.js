import { Router } from "express";
import { userController } from "./user.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

export const userRoutes = Router();

userRoutes.use(authenticate);
userRoutes.get("/search", userController.search);
userRoutes.get("/me", userController.me);
userRoutes.patch("/me", userController.updateMe);
