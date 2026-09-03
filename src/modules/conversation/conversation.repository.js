import { ConversationModel } from "./conversation.model.js";

export const conversationRepository = {
  async findById(id) {
    try {
      return await ConversationModel.findById(id)
        .populate("members.user")
        .populate("createdBy")
        .lean();
    } catch (error) {
      if (error instanceof Error && error.name === "CastError") {
        return null;
      }
      throw error;
    }
  },

  async findByDirectKey(directKey) {
    return ConversationModel.findOne({ directKey })
      .populate("members.user")
      .lean();
  },

  async listForUser(userId) {
    return ConversationModel.find({ "members.user": userId })
      .populate("members.user")
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .lean();
  },

  async createDirect({ userId, otherUserId, directKey }) {
    return ConversationModel.create({
      type: "DIRECT",
      directKey,
      createdBy: userId,
      members: [
        { user: userId, role: "OWNER" },
        { user: otherUserId, role: "MEMBER" },
      ],
    });
  },

  async createGroup({ userId, name, description, memberIds }) {
    return ConversationModel.create({
      type: "GROUP",
      name,
      description,
      createdBy: userId,
      members: [
        { user: userId, role: "OWNER" },
        ...memberIds.map((memberId) => ({ user: memberId, role: "MEMBER" })),
      ],
    });
  },

  async updateById(id, updates) {
    return ConversationModel.findByIdAndUpdate(id, updates, {
      new: true,
    }).lean();
  },

  async addMembers(conversationId, memberIds) {
    return ConversationModel.findByIdAndUpdate(
      conversationId,
      {
        $addToSet: {
          members: {
            $each: memberIds.map((userId) => ({
              user: userId,
              role: "MEMBER",
            })),
          },
        },
      },
      { new: true },
    ).lean();
  },

  async removeMember(conversationId, memberId) {
    return ConversationModel.findByIdAndUpdate(
      conversationId,
      {
        $pull: { members: { user: memberId } },
      },
      { new: true },
    ).lean();
  },
};
