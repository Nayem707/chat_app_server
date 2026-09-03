import { MessageModel } from "./message.model.js";

export const messageRepository = {
  async countByConversation(conversationId) {
    return MessageModel.countDocuments({
      conversation: conversationId,
      deletedAt: null,
    });
  },

  async listByConversation({
    conversationId,
    page = 1,
    limit = 20,
    currentUserId,
  }) {
    const skip = (Number(page) - 1) * Number(limit);
    const messages = await MessageModel.find({
      conversation: conversationId,
      deletedAt: null,
    })
      .populate("sender")
      .populate("reads.user")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    if (currentUserId) {
      const unreadMessageIds = messages
        .filter(
          (message) =>
            message.sender?.toString?.() !== currentUserId &&
            !message.reads?.some(
              (read) => read.user?._id?.toString?.() === currentUserId,
            ),
        )
        .map((message) => message._id);

      if (unreadMessageIds.length) {
        await MessageModel.updateMany(
          { _id: { $in: unreadMessageIds } },
          { $addToSet: { reads: { user: currentUserId, readAt: new Date() } } },
        );
      }
    }

    return messages;
  },

  async create({
    conversationId,
    senderId,
    content,
    type = "TEXT",
    status = "SENT",
  }) {
    const message = await MessageModel.create({
      conversation: conversationId,
      sender: senderId,
      content,
      type,
      status,
      reads: [{ user: senderId, readAt: new Date() }],
    });

    const withSender = await message.populate("sender");
    const populated = await withSender.populate("reads.user");
    return populated.toObject ? populated.toObject() : populated;
  },

  async findById(id) {
    return MessageModel.findById(id).lean();
  },

  async updateById(id, updates) {
    return MessageModel.findByIdAndUpdate(id, updates, { new: true })
      .populate("sender")
      .populate("reads.user")
      .lean();
  },
};
