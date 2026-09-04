import { messageRepository } from "./message.repository.js";
import { conversationRepository } from "../conversation/conversation.repository.js";
import { friendshipRepository } from "../friends/friendship.repository.js";
import { ForbiddenError } from "../../errors/AppError.js";

const normalizeMessage = (message) => {
  if (!message) return null;

  const sender =
    message.sender && typeof message.sender === "object"
      ? message.sender
      : null;
  // After Mongoose schema transformation, sender has 'id' (string). Before transformation, it has '_id'.
  const senderId =
    sender?.id || sender?._id?.toString?.() || message.sender?.toString?.();

  return {
    id: message._id?.toString?.() ?? message.id,
    conversationId:
      message.conversation?.toString?.() ?? message.conversationId,
    senderId,
    senderName: sender?.displayName || sender?.name || "Unknown user",
    text: message.content,
    content: message.content,
    type: message.type,
    status: message.status,
    createdAt: message.createdAt
      ? new Date(message.createdAt).toISOString()
      : new Date().toISOString(),
    updatedAt: message.updatedAt
      ? new Date(message.updatedAt).toISOString()
      : null,
    editedAt: message.editedAt
      ? new Date(message.editedAt).toISOString()
      : null,
    deletedAt: message.deletedAt
      ? new Date(message.deletedAt).toISOString()
      : null,
    readBy: Array.isArray(message.reads)
      ? message.reads
          .map(
            (read) =>
              read.user?.id ||
              read.user?._id?.toString?.() ||
              read.user?.toString?.(),
          )
          .filter(Boolean)
      : [],
  };
};

export const messageService = {
  async list(conversationId, page, limit, currentUserId) {
    const [total, items] = await Promise.all([
      messageRepository.countByConversation(conversationId),
      messageRepository.listByConversation({
        conversationId,
        page,
        limit,
        currentUserId,
      }),
    ]);

    return {
      items: items.map(normalizeMessage),
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.max(1, Math.ceil(total / Number(limit))),
    };
  },

  async create({ conversationId, senderId, content }) {
    // Reject if sender is trying to message in a DIRECT conv without friendship.
    const conversation = await conversationRepository.findById(conversationId);
    if (conversation?.type === "DIRECT") {
      const otherMember = conversation.members?.find((m) => {
        const mId = m.user?._id?.toString?.() ?? m.user?.toString?.();
        return mId && mId !== senderId;
      });
      const otherId =
        otherMember?.user?._id?.toString?.() ?? otherMember?.user?.toString?.();
      if (otherId) {
        const friends = await friendshipRepository.areFriends(
          senderId,
          otherId,
        );
        if (!friends)
          throw new ForbiddenError(
            "You can only send messages to accepted friends.",
          );
      }
    }

    const message = await messageRepository.create({
      conversationId,
      senderId,
      content: String(content).trim(),
    });

    await conversationRepository.updateById(conversationId, {
      lastMessageAt: new Date(),
    });
    return normalizeMessage(message);
  },

  async update(messageId, senderId, content) {
    const existing = await messageRepository.findById(messageId);
    if (!existing) {
      const error = new Error("Message not found.");
      error.status = 404;
      throw error;
    }

    if (existing.sender?.toString?.() !== senderId) {
      const error = new Error("You can only edit your own messages.");
      error.status = 403;
      throw error;
    }

    const updated = await messageRepository.updateById(messageId, {
      content: String(content).trim(),
      editedAt: new Date(),
      editedBy: senderId,
    });

    return normalizeMessage(updated);
  },

  async delete(messageId, senderId) {
    const existing = await messageRepository.findById(messageId);
    if (!existing) {
      const error = new Error("Message not found.");
      error.status = 404;
      throw error;
    }

    if (existing.sender?.toString?.() !== senderId) {
      const error = new Error("You can only delete your own messages.");
      error.status = 403;
      throw error;
    }

    const updated = await messageRepository.updateById(messageId, {
      deletedAt: new Date(),
      content: "[deleted]",
    });

    return normalizeMessage(updated);
  },
};
