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
    const group = await appStore.createGroupConversation(user.id, {
      name,
      description,
      memberIds,
    });
    const conversations = await appStore.getConversationsForUser(user.id);
    const payload = conversations.find((c) => c.id === group.id);
    res.status(201).json({ success: true, data: payload });
  }),
);

groupsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const conversation = await appStore.getConversationById(req.params.id);
    if (!conversation) {
      const error = new Error("Group not found.");
      error.status = 404;
      throw error;
    }
    const conversations = await appStore.getConversationsForUser(req.user.id);
    res.json({
      success: true,
      data: conversations.find((c) => c.id === conversation.id),
    });
  }),
);

groupsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const conversation = await appStore.getConversationById(req.params.id);
    if (!conversation) {
      const error = new Error("Group not found.");
      error.status = 404;
      throw error;
    }
    const { name, description } = req.body || {};
    await appStore.updateGroupInfo(req.params.id, { name, description });
    const conversations = await appStore.getConversationsForUser(req.user.id);
    res.json({
      success: true,
      data: conversations.find((c) => c.id === req.params.id),
    });
  }),
);

groupsRouter.post(
  "/:id/members",
  asyncHandler(async (req, res) => {
    const conversation = await appStore.getConversationById(req.params.id);
    if (!conversation) {
      const error = new Error("Group not found.");
      error.status = 404;
      throw error;
    }
    const { memberIds = [] } = req.body || {};
    await appStore.addGroupMembers(req.params.id, memberIds);
    const conversations = await appStore.getConversationsForUser(req.user.id);
    res.json({
      success: true,
      data: conversations.find((c) => c.id === req.params.id),
    });
  }),
);

groupsRouter.delete(
  "/:id/members/:memberId",
  asyncHandler(async (req, res) => {
    const conversation = await appStore.getConversationById(req.params.id);
    if (!conversation) {
      const error = new Error("Group not found.");
      error.status = 404;
      throw error;
    }
    await appStore.removeGroupMember(req.params.id, req.params.memberId);
    const conversations = await appStore.getConversationsForUser(req.user.id);
    res.json({
      success: true,
      data: conversations.find((c) => c.id === req.params.id),
    });
  }),
);

groupsRouter.delete(
  "/:id/leave",
  asyncHandler(async (req, res) => {
    const conversation = await appStore.getConversationById(req.params.id);
    if (!conversation) {
      const error = new Error("Group not found.");
      error.status = 404;
      throw error;
    }
    await appStore.removeGroupMember(req.params.id, req.user.id);
    res.json({ success: true, data: { message: "Left the group." } });
  }),
);
