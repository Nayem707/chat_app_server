import { Router } from "express";
import { healthRouter } from "../modules/health/health.routes.js";
import { authRoutes } from "../modules/auth/auth.routes.js";
import { userRoutes } from "../modules/user/user.routes.js";
import { conversationRoutes } from "../modules/conversation/conversation.routes.js";
import { groupRoutes } from "../modules/group/group.routes.js";
import { friendshipRoutes } from "../modules/friends/friendship.routes.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRoutes);
apiRouter.use("/users", userRoutes);
apiRouter.use("/conversations", conversationRoutes);
apiRouter.use("/groups", groupRoutes);
apiRouter.use("/friends", friendshipRoutes);
