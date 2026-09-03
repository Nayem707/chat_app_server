import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { appStore } from "../store.js";

export const conversationsRouter = Router();

conversationsRouter.use(authenticate);

conversationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user;
    const conversations = appStore.getConversationsForUser(user.id);
    res.json({ success: true, data: conversations });
  }),
);

conversationsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user;
    const { userId: otherUserId, type = "DIRECT" } = req.body || {};

    if (!otherUserId) {
      const error = new Error("A userId is required to start a conversation.");
      error.status = 400;
      throw error;
    }

    if (type === "DIRECT") {
      const conversation = appStore.createDirectConversation(
        user.id,
        otherUserId,
      );
      res.status(201).json({
        success: true,
        data: appStore
          .getConversationsForUser(user.id)
          .find((entry) => entry.id === conversation.id),
      });
      return;
    }

    const error = new Error(
      "Only direct conversations are supported in this route.",
    );
    error.status = 400;
    throw error;
  }),
);

conversationsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const conversation = appStore.getConversationById(req.params.id);
    if (!conversation) {
      const error = new Error("Conversation not found.");
      error.status = 404;
      throw error;
    }

    const currentUser = req.user;
    res.json({
      success: true,
      data: appStore
        .getConversationsForUser(currentUser.id)
        .find((entry) => entry.id === conversation.id),
    });
  }),
);

conversationsRouter.get(
  "/:id/messages",
  asyncHandler(async (req, res) => {
    const user = req.user;
    const { page = 1, limit = 20 } = req.query;
    const conversation = appStore.getConversationById(req.params.id);
    if (!conversation) {
      const error = new Error("Conversation not found.");
      error.status = 404;
      throw error;
    }

    const payload = appStore.getMessagesForConversation(
      req.params.id,
      Number(page),
      Number(limit),
      user.id,
    );
    res.json({ success: true, data: payload });
  }),
);

conversationsRouter.post(
  "/:id/messages",
  asyncHandler(async (req, res) => {
    const user = req.user;
    const conversation = appStore.getConversationById(req.params.id);
    if (!conversation) {
      const error = new Error("Conversation not found.");
      error.status = 404;
      throw error;
    }

    const { content } = req.body || {};
    if (!String(content || "").trim()) {
      const error = new Error("A message is required.");
      error.status = 400;
      throw error;
    }

    const message = appStore.createMessage({
      conversationId: req.params.id,
      senderId: user.id,
      content: String(content).trim(),
    });

    // Broadcast to all conversation members currently connected
    const io = req.app.get("io");
    io?.to(`conversation:${req.params.id}`).emit("new_message", { message });

    res.status(201).json({ success: true, data: message });
  }),
);

conversationsRouter.patch(
  "/:id/messages/:messageId",
  asyncHandler(async (req, res) => {
    const user = req.user;
    const { content } = req.body || {};
    const message = appStore.updateMessage(
      req.params.messageId,
      user.id,
      String(content || "").trim(),
    );
    res.json({ success: true, data: message });
  }),
);

conversationsRouter.delete(
  "/:id/messages/:messageId",
  asyncHandler(async (req, res) => {
    const user = req.user;
    appStore.deleteMessage(req.params.messageId, user.id);
    res.json({ success: true, data: { message: "Message deleted." } });
  }),
);
