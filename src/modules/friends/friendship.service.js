import { friendshipRepository } from "./friendship.repository.js";
import { userRepository } from "../user/user.repository.js";
import { sanitizeUser } from "../user/user.service.js";
import {
  ConflictError,
  NotFoundError,
  ForbiddenError,
} from "../../errors/AppError.js";

const toId = (doc) =>
  doc?._id?.toString?.() ?? doc?.id?.toString?.() ?? doc?.toString?.();

const normalizeFriendship = (friendship, currentUserId) => {
  if (!friendship) return null;
  const requesterId = toId(friendship.requester);
  return {
    id: toId(friendship) ?? friendship.id,
    status: friendship.status,
    isRequester: requesterId === currentUserId,
    requester: sanitizeUser(friendship.requester),
    recipient: sanitizeUser(friendship.recipient),
    createdAt: friendship.createdAt,
    updatedAt: friendship.updatedAt,
  };
};

export const friendshipService = {
  async sendRequest(requesterId, recipientId) {
    if (requesterId === recipientId) {
      const err = new Error("You cannot send a friend request to yourself.");
      err.status = 400;
      throw err;
    }

    const recipient = await userRepository.findById(recipientId);
    if (!recipient) throw new NotFoundError("User not found.");

    const existing = await friendshipRepository.findBetween(
      requesterId,
      recipientId,
    );

    if (existing) {
      if (existing.status === "ACCEPTED")
        throw new ConflictError("You are already friends.");
      if (existing.status === "PENDING")
        throw new ConflictError("A friend request already exists.");
      // REJECTED or CANCELLED — allow a fresh request by recycling the record.
      const updated = await friendshipRepository.updateStatus(
        toId(existing),
        "PENDING",
      );
      return normalizeFriendship(updated, requesterId);
    }

    const friendship = await friendshipRepository.create({
      requesterId,
      recipientId,
    });
    return normalizeFriendship(friendship, requesterId);
  },

  async acceptRequest(requestId, userId) {
    const friendship = await friendshipRepository.findById(requestId);
    if (!friendship) throw new NotFoundError("Friend request not found.");

    if (toId(friendship.recipient) !== userId)
      throw new ForbiddenError("You cannot accept this request.");

    if (friendship.status !== "PENDING") {
      const err = new Error("Only pending requests can be accepted.");
      err.status = 400;
      throw err;
    }

    const updated = await friendshipRepository.updateStatus(
      requestId,
      "ACCEPTED",
    );
    return normalizeFriendship(updated, userId);
  },

  async rejectRequest(requestId, userId) {
    const friendship = await friendshipRepository.findById(requestId);
    if (!friendship) throw new NotFoundError("Friend request not found.");

    if (toId(friendship.recipient) !== userId)
      throw new ForbiddenError("You cannot reject this request.");

    if (friendship.status !== "PENDING") {
      const err = new Error("Only pending requests can be rejected.");
      err.status = 400;
      throw err;
    }

    const updated = await friendshipRepository.updateStatus(
      requestId,
      "REJECTED",
    );
    return normalizeFriendship(updated, userId);
  },

  async cancelRequest(requestId, userId) {
    const friendship = await friendshipRepository.findById(requestId);
    if (!friendship) throw new NotFoundError("Friend request not found.");

    if (toId(friendship.requester) !== userId)
      throw new ForbiddenError("You cannot cancel this request.");

    if (friendship.status !== "PENDING") {
      const err = new Error("Only pending requests can be cancelled.");
      err.status = 400;
      throw err;
    }

    const updated = await friendshipRepository.updateStatus(
      requestId,
      "CANCELLED",
    );
    return normalizeFriendship(updated, userId);
  },

  async getFriends(userId) {
    const friendships = await friendshipRepository.getAcceptedFriends(userId);
    return friendships.map((f) => {
      const friend = toId(f.requester) === userId ? f.recipient : f.requester;
      return sanitizeUser(friend);
    });
  },

  async getIncomingRequests(userId) {
    const requests = await friendshipRepository.getIncomingRequests(userId);
    return requests.map((r) => normalizeFriendship(r, userId));
  },

  async getSentRequests(userId) {
    const requests = await friendshipRepository.getSentRequests(userId);
    return requests.map((r) => normalizeFriendship(r, userId));
  },

  async getStatus(userId, otherUserId) {
    const friendship = await friendshipRepository.findBetween(
      userId,
      otherUserId,
    );
    if (!friendship)
      return { status: "NONE", requestId: null, isRequester: null };
    return {
      status: friendship.status,
      requestId: toId(friendship),
      isRequester: toId(friendship.requester) === userId,
    };
  },

  async areFriends(userId1, userId2) {
    return friendshipRepository.areFriends(userId1, userId2);
  },
};
