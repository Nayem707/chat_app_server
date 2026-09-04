import { FriendshipModel } from "./friendship.model.js";

const toId = (doc) =>
  doc?._id?.toString?.() ?? doc?.id?.toString?.() ?? doc?.toString?.();

export const friendshipRepository = {
  async findBetween(userId1, userId2) {
    return FriendshipModel.findOne({
      $or: [
        { requester: userId1, recipient: userId2 },
        { requester: userId2, recipient: userId1 },
      ],
    })
      .populate("requester recipient")
      .lean();
  },

  async findById(id) {
    try {
      return await FriendshipModel.findById(id)
        .populate("requester recipient")
        .lean();
    } catch {
      return null;
    }
  },

  async create({ requesterId, recipientId }) {
    const doc = await FriendshipModel.create({
      requester: requesterId,
      recipient: recipientId,
    });
    const populated = await doc.populate("requester recipient");
    return populated.toObject ? populated.toObject() : populated;
  },

  async updateStatus(id, status) {
    return FriendshipModel.findByIdAndUpdate(id, { status }, { new: true })
      .populate("requester recipient")
      .lean();
  },

  async getAcceptedFriends(userId) {
    return FriendshipModel.find({
      $or: [
        { requester: userId, status: "ACCEPTED" },
        { recipient: userId, status: "ACCEPTED" },
      ],
    })
      .populate("requester recipient")
      .lean();
  },

  async getIncomingRequests(userId) {
    return FriendshipModel.find({ recipient: userId, status: "PENDING" })
      .populate("requester recipient")
      .lean();
  },

  async getSentRequests(userId) {
    return FriendshipModel.find({ requester: userId, status: "PENDING" })
      .populate("requester recipient")
      .lean();
  },

  async areFriends(userId1, userId2) {
    const found = await FriendshipModel.findOne({
      $or: [
        { requester: userId1, recipient: userId2, status: "ACCEPTED" },
        { requester: userId2, recipient: userId1, status: "ACCEPTED" },
      ],
    }).lean();
    return Boolean(found);
  },
};
