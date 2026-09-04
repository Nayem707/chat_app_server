import { asyncHandler } from "../../utils/asyncHandler.js";
import { friendshipService } from "./friendship.service.js";

export const friendshipController = {
  sendRequest: asyncHandler(async (req, res) => {
    const { recipientId } = req.body || {};
    if (!recipientId) {
      const err = new Error("recipientId is required.");
      err.status = 400;
      throw err;
    }
    const data = await friendshipService.sendRequest(req.user.id, recipientId);
    res.status(201).json({ success: true, data });
  }),

  getFriends: asyncHandler(async (req, res) => {
    const data = await friendshipService.getFriends(req.user.id);
    res.json({ success: true, data });
  }),

  getIncomingRequests: asyncHandler(async (req, res) => {
    const data = await friendshipService.getIncomingRequests(req.user.id);
    res.json({ success: true, data });
  }),

  getSentRequests: asyncHandler(async (req, res) => {
    const data = await friendshipService.getSentRequests(req.user.id);
    res.json({ success: true, data });
  }),

  getStatus: asyncHandler(async (req, res) => {
    const data = await friendshipService.getStatus(
      req.user.id,
      req.params.userId,
    );
    res.json({ success: true, data });
  }),

  accept: asyncHandler(async (req, res) => {
    const data = await friendshipService.acceptRequest(
      req.params.requestId,
      req.user.id,
    );
    res.json({ success: true, data });
  }),

  reject: asyncHandler(async (req, res) => {
    const data = await friendshipService.rejectRequest(
      req.params.requestId,
      req.user.id,
    );
    res.json({ success: true, data });
  }),

  cancel: asyncHandler(async (req, res) => {
    const data = await friendshipService.cancelRequest(
      req.params.requestId,
      req.user.id,
    );
    res.json({ success: true, data });
  }),
};
