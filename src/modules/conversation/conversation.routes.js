import { Router } from "express";
import { conversationController } from "./conversation.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { messageRoutes } from "../message/message.routes.js";

export const conversationRoutes = Router();
conversationRoutes.use(authenticate);
conversationRoutes.get("/", conversationController.list);
conversationRoutes.post("/", conversationController.create);
conversationRoutes.get("/:id", conversationController.getById);
conversationRoutes.use("/:id/messages", messageRoutes);
