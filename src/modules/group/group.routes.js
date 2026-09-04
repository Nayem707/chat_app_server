import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { conversationService } from "../conversation/conversation.service.js";
import { friendshipRepository } from "../friends/friendship.repository.js";
import { ForbiddenError } from "../../errors/AppError.js";

export const groupRoutes = Router();
groupRoutes.use(authenticate);

groupRoutes.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, description, memberIds = [] } = req.body || {};
    if (!name?.trim()) {
      const error = new Error("A group name is required.");
      error.status = 400;
      throw error;
    }

    // Only accepted friends can be added to a group.
    const friendChecks = await Promise.all(
      memberIds.map((id) => friendshipRepository.areFriends(req.user.id, id)),
    );
    if (friendChecks.some((isFriend) => !isFriend))
      throw new ForbiddenError("You can only add accepted friends to a group.");

    const created = await conversationService.createGroup(req.user.id, {
      name,
      description,
      memberIds,
    });
    const conversations = await conversationService.getForUser(req.user.id);
    const payload = conversations.find(
      (conversation) =>
        conversation.id === created._id?.toString?.() ||
        conversation.id === created.id,
    );
    res.status(201).json({ success: true, data: payload });
  }),
);

groupRoutes.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const conversation = await conversationService.getById(req.params.id);
    if (!conversation) {
      const error = new Error("Group not found.");
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
);

groupRoutes.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const conversation = await conversationService.getById(req.params.id);
    if (!conversation) {
      const error = new Error("Group not found.");
      error.status = 404;
      throw error;
    }
    const { name, description } = req.body || {};
    await conversationService.updateGroup(req.params.id, { name, description });
    const conversations = await conversationService.getForUser(req.user.id);
    res.json({
      success: true,
      data: conversations.find((item) => item.id === req.params.id),
    });
  }),
);

groupRoutes.post(
  "/:id/members",
  asyncHandler(async (req, res) => {
    const conversation = await conversationService.getById(req.params.id);
    if (!conversation) {
      const error = new Error("Group not found.");
      error.status = 404;
      throw error;
    }
    const { memberIds = [] } = req.body || {};
    await conversationService.addGroupMembers(req.params.id, memberIds);
    const conversations = await conversationService.getForUser(req.user.id);
    res.json({
      success: true,
      data: conversations.find((item) => item.id === req.params.id),
    });
  }),
);

groupRoutes.delete(
  "/:id/members/:memberId",
  asyncHandler(async (req, res) => {
    const conversation = await conversationService.getById(req.params.id);
    if (!conversation) {
      const error = new Error("Group not found.");
      error.status = 404;
      throw error;
    }
    await conversationService.removeGroupMember(
      req.params.id,
      req.params.memberId,
    );
    const conversations = await conversationService.getForUser(req.user.id);
    res.json({
      success: true,
      data: conversations.find((item) => item.id === req.params.id),
    });
  }),
);

groupRoutes.delete(
  "/:id/leave",
  asyncHandler(async (req, res) => {
    const conversation = await conversationService.getById(req.params.id);
    if (!conversation) {
      const error = new Error("Group not found.");
      error.status = 404;
      throw error;
    }
    await conversationService.removeGroupMember(req.params.id, req.user.id);
    res.json({ success: true, data: { message: "Left the group." } });
  }),
);
