import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { appStore } from "../store.js";

export const groupsRouter = Router();

groupsRouter.use(authenticate);

groupsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user;
    const { name, description, memberIds = [] } = req.body || {};

    if (!name?.trim()) {
      const error = new Error("A group name is required.");
      error.status = 400;
      throw error;
    }

    const group = appStore.createGroupConversation(user.id, {
      name,
      description,
      memberIds,
    });
    const payload = appStore
      .getConversationsForUser(user.id)
      .find((entry) => entry.id === group.id);
    res.status(201).json({ success: true, data: payload });
  }),
);

groupsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const conversation = appStore.getConversationById(req.params.id);
    if (!conversation) {
      const error = new Error("Group not found.");
      error.status = 404;
      throw error;
    }

    const user = req.user;
    const payload = appStore
      .getConversationsForUser(user.id)
      .find((entry) => entry.id === conversation.id);
    res.json({ success: true, data: payload });
  }),
);

groupsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = req.user;
    const conversation = appStore.getConversationById(req.params.id);
    if (!conversation) {
      const error = new Error("Group not found.");
      error.status = 404;
      throw error;
    }

    const { name, description } = req.body || {};
    if (name) conversation.title = name.trim();
    if (description !== undefined)
      conversation.description = description.trim();
    conversation.updatedAt = new Date().toISOString();

    const payload = appStore
      .getConversationsForUser(user.id)
      .find((entry) => entry.id === conversation.id);
    res.json({ success: true, data: payload });
  }),
);

groupsRouter.post(
  "/:id/members",
  asyncHandler(async (req, res) => {
    const user = req.user;
    const conversation = appStore.getConversationById(req.params.id);
    if (!conversation) {
      const error = new Error("Group not found.");
      error.status = 404;
      throw error;
    }

    const { memberIds = [] } = req.body || {};
    for (const memberId of memberIds) {
      if (!conversation.members.some((member) => member.userId === memberId)) {
        conversation.members.push({
          userId: memberId,
          role: "MEMBER",
          joinedAt: new Date().toISOString(),
        });
      }
    }
    conversation.updatedAt = new Date().toISOString();

    const payload = appStore
      .getConversationsForUser(user.id)
      .find((entry) => entry.id === conversation.id);
    res.json({ success: true, data: payload });
  }),
);

groupsRouter.delete(
  "/:id/members/:memberId",
  asyncHandler(async (req, res) => {
    const user = req.user;
    const conversation = appStore.getConversationById(req.params.id);
    if (!conversation) {
      const error = new Error("Group not found.");
      error.status = 404;
      throw error;
    }

    conversation.members = conversation.members.filter(
      (member) => member.userId !== req.params.memberId,
    );
    conversation.updatedAt = new Date().toISOString();

    const payload = appStore
      .getConversationsForUser(user.id)
      .find((entry) => entry.id === conversation.id);
    res.json({ success: true, data: payload });
  }),
);

groupsRouter.delete(
  "/:id/leave",
  asyncHandler(async (req, res) => {
    const user = req.user;
    const conversation = appStore.getConversationById(req.params.id);
    if (!conversation) {
      const error = new Error("Group not found.");
      error.status = 404;
      throw error;
    }

    conversation.members = conversation.members.filter(
      (member) => member.userId !== user.id,
    );
    conversation.updatedAt = new Date().toISOString();

    res.json({ success: true, data: { message: "Left the group." } });
  }),
);
