import { conversationRepository } from "./conversation.repository.js";
import { userRepository } from "../user/user.repository.js";
import { sanitizeUser } from "../user/user.service.js";

const buildMemberMeta = (member) => {
  const user = member.user || member.userId;
  const id = user?._id ? user._id.toString() : user?.id || member.userId;
  return {
    id,
    userId: id,
    name: user?.displayName || user?.name || "Unknown",
    email: user?.email || "",
    role: member.role,
    status: user?.isOnline ? "online" : "offline",
    avatar: user?.avatarUrl || "",
    coverUrl: user?.coverUrl || "",
    color: "from-violet-500 to-indigo-500",
  };
};

const buildConversationPayload = (conversation, currentUserId) => {
  const activeMembers = (conversation.members || []).filter(
    (member) => !member.leftAt,
  );
  const peer = activeMembers.find(
    (member) =>
      member.user?._id?.toString?.() !== currentUserId &&
      member.user?._id?.toString?.() !== currentUserId,
  );
  const title =
    conversation.type === "DIRECT"
      ? peer?.user?.displayName || "Direct chat"
      : conversation.name || "Group";

  return {
    id: conversation._id?.toString?.() || conversation.id,
    type: conversation.type,
    name: title,
    title,
    description: conversation.description || "",
    avatar:
      conversation.type === "DIRECT"
        ? peer?.user?.avatarUrl || ""
        : conversation.avatarUrl || "",
    color: "from-violet-500 to-indigo-500",
    members: activeMembers.map(
      (member) => member.user?._id?.toString?.() || member.userId,
    ),
    membersMeta: activeMembers.map(buildMemberMeta),
    status: activeMembers.some((member) => member.user?.isOnline)
      ? "online"
      : "offline",
    unreadCount: 0,
    lastMessage: null,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
};

export const conversationService = {
  async getForUser(userId) {
    const conversations = await conversationRepository.listForUser(userId);
    return conversations.map((conversation) =>
      buildConversationPayload(conversation, userId),
    );
  },

  async getById(id) {
    const conversation = await conversationRepository.findById(id);
    if (!conversation) return null;
    return buildConversationPayload(conversation, null);
  },

  async createDirect(userId, otherUserId) {
    const directKey = [userId, otherUserId].sort().join(":");
    const existing = await conversationRepository.findByDirectKey(directKey);
    if (existing) return existing;

    const created = await conversationRepository.createDirect({
      userId,
      otherUserId,
      directKey,
    });
    return created;
  },

  async createGroup(userId, { name, description, memberIds = [] }) {
    const uniqueIds = Array.from(new Set([userId, ...memberIds]));
    return conversationRepository.createGroup({
      userId,
      name: name.trim(),
      description: description?.trim() || "",
      memberIds: uniqueIds.filter((id) => id !== userId),
    });
  },

  async updateGroup(conversationId, { name, description }) {
    return conversationRepository.updateById(conversationId, {
      ...(name ? { name: name.trim() } : {}),
      ...(description !== undefined ? { description: description.trim() } : {}),
    });
  },

  async addGroupMembers(conversationId, memberIds) {
    return conversationRepository.addMembers(conversationId, memberIds);
  },

  async removeGroupMember(conversationId, memberId) {
    return conversationRepository.removeMember(conversationId, memberId);
  },

  async directPeerUser(conversation, currentUserId, users = []) {
    if (!conversation) return null;
    const members = conversation.membersMeta || conversation.members || [];
    const peerMember = members.find((member) => {
      const memberId =
        member.userId ?? member.id ?? member.user?._id?.toString?.();
      return memberId && memberId !== currentUserId;
    });
    if (!peerMember) return null;
    const peerId =
      peerMember.userId ?? peerMember.id ?? peerMember.user?._id?.toString?.();
    return users.find((user) => user.id === peerId) || null;
  },
};
