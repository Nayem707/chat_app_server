import { asyncHandler } from "../../utils/asyncHandler.js";
import { conversationService } from "./conversation.service.js";
import { messageService } from "../message/message.service.js";

export const conversationController = {
  list: asyncHandler(async (req, res) => {
    const conversations = await conversationService.getForUser(req.user.id);
    res.json({ success: true, data: conversations });
  }),

  create: asyncHandler(async (req, res) => {
    const { userId: otherUserId, type = "DIRECT" } = req.body || {};
    if (!otherUserId) {
      const error = new Error("A userId is required to start a conversation.");
      error.status = 400;
      throw error;
    }

    if (type === "DIRECT") {
      const created = await conversationService.createDirect(
        req.user.id,
        otherUserId,
      );
      const conversations = await conversationService.getForUser(req.user.id);
      const payload = conversations.find(
        (conversation) =>
          conversation.id === (created._id?.toString?.() || created.id),
      );
      res.status(201).json({ success: true, data: payload });
      return;
    }

    const error = new Error(
      "Only direct conversations are supported in this route.",
    );
    error.status = 400;
    throw error;
  }),

  getById: asyncHandler(async (req, res) => {
    const conversation = await conversationService.getById(req.params.id);
    if (!conversation) {
      const error = new Error("Conversation not found.");
      error.status = 404;
      throw error;
    }
    const conversations = await conversationService.getForUser(req.user.id);
    res.json({
      success: true,
      data:
        conversations.find((item) => item.id === req.params.id) || conversation,
    });
  }),
};
