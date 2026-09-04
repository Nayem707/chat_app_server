import { Router } from "express";
import { messageController } from "./message.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { uploadMessageFile } from "../../middlewares/upload.middleware.js";

export const messageRoutes = Router({ mergeParams: true });

messageRoutes.use(authenticate);
messageRoutes.get("/", messageController.list);
messageRoutes.post("/", messageController.create);
messageRoutes.post(
  "/attachment",
  uploadMessageFile,
  messageController.createWithAttachment,
);
messageRoutes.patch("/:messageId", messageController.update);
messageRoutes.delete("/:messageId", messageController.remove);
