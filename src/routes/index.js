import { Router } from "express";
import { healthRouter } from "../modules/health/health.routes.js";
import { authRouter } from "../modules/auth/auth.routes.js";
import { usersRouter } from "../modules/users/users.routes.js";
import { conversationsRouter } from "../modules/conversations/conversations.routes.js";
import { groupsRouter } from "../modules/groups/groups.routes.js";

/**
 * Single mount point for all versioned API routes.
 * Module routers are registered here — feature code stays in `modules/*`.
 */
export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/conversations", conversationsRouter);
apiRouter.use("/groups", groupsRouter);
