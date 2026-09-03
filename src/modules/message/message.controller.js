import { asyncHandler } from "../../utils/asyncHandler.js";
import { messageService } from "./message.service.js";

export const messageController = {
  list: asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const payload = await messageService.list(
      req.params.id,
      page,
      limit,
      req.user.id,
    );
    res.json({ success: true, data: payload });
  }),

  create: asyncHandler(async (req, res) => {
    const { content } = req.body || {};
    const payload = await messageService.create({
      conversationId: req.params.id,
      senderId: req.user.id,
      content,
    });
    const io = req.app.get("io");
    io?.to(`conversation:${req.params.id}`).emit("new_message", {
      message: payload,
    });
    res.status(201).json({ success: true, data: payload });
  }),

  update: asyncHandler(async (req, res) => {
    const { content } = req.body || {};
    const payload = await messageService.update(
      req.params.messageId,
      req.user.id,
      content,
    );
    res.json({ success: true, data: payload });
  }),

  remove: asyncHandler(async (req, res) => {
    await messageService.delete(req.params.messageId, req.user.id);
    res.json({ success: true, data: { message: "Message deleted." } });
  }),
};
