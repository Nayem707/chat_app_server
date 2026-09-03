import argon2 from "argon2";
import { prisma } from "../config/database.js";

// Access-token JTI denylist — short-lived tokens (15 min) don't need DB persistence.
const revokedJtis = new Set();

const COLORS = [
  "from-violet-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-cyan-500 to-sky-500",
  "from-pink-500 to-rose-500",
  "from-fuchsia-500 to-purple-500",
  "from-red-500 to-pink-500",
];
const deriveColor = (id = "") =>
  COLORS[parseInt(id.slice(-1), 16) % COLORS.length];

// Map a Prisma User row to the shape expected by all routes and the client.
export const formatUser = (user) => ({
  id: user.id,
  name: user.displayName,
  email: user.email,
  username: user.username,
  bio: user.bio || "",
  avatar: user.displayName?.slice(0, 2).toUpperCase() || "U",
  color: deriveColor(user.id),
  status: user.isOnline ? "online" : "offline",
  createdAt: user.createdAt?.toISOString?.() ?? user.createdAt,
  updatedAt: user.updatedAt?.toISOString?.() ?? user.updatedAt,
});

async function buildConversationPayload(conversation, currentUserId) {
  const activeMembers = conversation.members.filter((m) => !m.leftAt);

  let title, avatar, color;
  if (conversation.type === "DIRECT") {
    const peer = activeMembers.find((m) => m.userId !== currentUserId);
    title = peer?.user?.displayName || "Direct chat";
    avatar = peer?.user?.displayName?.slice(0, 2).toUpperCase() || "DM";
    color = deriveColor(peer?.userId || "");
  } else {
    title = conversation.name || "Group";
    avatar = conversation.name?.slice(0, 2).toUpperCase() || "GR";
    color = deriveColor(conversation.id);
  }

  const [unreadCount, lastMessage] = await Promise.all([
    prisma.message.count({
      where: {
        conversationId: conversation.id,
        senderId: { not: currentUserId },
        deletedAt: null,
        reads: { none: { userId: currentUserId } },
      },
    }),
    prisma.message.findFirst({
      where: { conversationId: conversation.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    id: conversation.id,
    type: conversation.type,
    name: title,
    title,
    description: conversation.description || "",
    avatar,
    color,
    members: activeMembers.map((m) => m.userId),
    membersMeta: activeMembers.map((m) => ({
      id: m.userId,
      userId: m.userId,
      name: m.user?.displayName || "Unknown",
      email: m.user?.email || "",
      role: m.role,
      status: m.user?.isOnline ? "online" : "offline",
      avatar: m.user?.displayName?.slice(0, 2).toUpperCase() || "U",
      color: deriveColor(m.userId),
    })),
    status: activeMembers.some((m) => m.user?.isOnline) ? "online" : "offline",
    unreadCount,
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          senderId: lastMessage.senderId,
          text: lastMessage.content,
          content: lastMessage.content,
          createdAt:
            lastMessage.createdAt?.toISOString?.() ?? lastMessage.createdAt,
          status: lastMessage.status,
        }
      : null,
    createdAt:
      conversation.createdAt?.toISOString?.() ?? conversation.createdAt,
    updatedAt:
      conversation.updatedAt?.toISOString?.() ?? conversation.updatedAt,
  };
}

const formatMessage = (message) => ({
  id: message.id,
  conversationId: message.conversationId,
  senderId: message.senderId,
  senderName: message.sender?.displayName || "Unknown user",
  text: message.content,
  content: message.content,
  type: message.type,
  status: message.status,
  createdAt: message.createdAt?.toISOString?.() ?? message.createdAt,
  updatedAt: message.updatedAt?.toISOString?.() ?? message.updatedAt,
  editedAt: message.editedAt?.toISOString?.() ?? null,
  deletedAt: message.deletedAt?.toISOString?.() ?? null,
  readBy: message.reads?.map((r) => r.userId) ?? [],
});

const MEMBER_INCLUDE = {
  where: { leftAt: null },
  include: { user: true },
};

export const appStore = {
  sanitizeUser: formatUser,

  revokeToken(jti) {
    revokedJtis.add(jti);
  },
  isTokenRevoked(jti) {
    return revokedJtis.has(jti);
  },

  findUserByEmail(email) {
    return prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
  },
  findUserById(id) {
    return prisma.user.findUnique({ where: { id } });
  },

  async registerUser({ name, email, password }) {
    if (!name?.trim() || !email?.trim() || !password) {
      const err = new Error("Name, email, and password are required.");
      err.status = 400;
      throw err;
    }
    if (await this.findUserByEmail(email)) {
      const err = new Error("User with this email already exists.");
      err.status = 409;
      throw err;
    }
    const passwordHash = await argon2.hash(password);
    const base = name.trim().toLowerCase().replace(/\s+/g, ".");
    const username = `${base}.${Math.random().toString(36).slice(2, 6)}`;
    return prisma.user.create({
      data: {
        displayName: name.trim(),
        email: email.trim().toLowerCase(),
        username,
        passwordHash,
        isOnline: true,
      },
    });
  },

  async loginUser({ email, password }) {
    const user = await this.findUserByEmail(email);
    if (!user || !(await argon2.verify(user.passwordHash, password))) {
      const err = new Error("Invalid email or password.");
      err.status = 401;
      throw err;
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true },
    });
    return user;
  },

  async updateUser(userId, updates) {
    const data = {};
    if (updates.name) data.displayName = updates.name;
    if (typeof updates.bio === "string") data.bio = updates.bio;
    return prisma.user.update({ where: { id: userId }, data });
  },

  async getUsersForSearch(currentUserId, query = "") {
    const q = query.trim();
    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        ...(q
          ? {
              OR: [
                { displayName: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      take: 20,
    });
    return users.map(formatUser);
  },

  getConversationById(conversationId) {
    return prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: MEMBER_INCLUDE },
    });
  },

  async getConversationsForUser(userId) {
    const conversations = await prisma.conversation.findMany({
      where: { members: { some: { userId, leftAt: null } } },
      include: { members: MEMBER_INCLUDE },
      orderBy: { lastMessageAt: "desc" },
    });
    return Promise.all(
      conversations.map((c) => buildConversationPayload(c, userId)),
    );
  },

  async createDirectConversation(userId, otherUserId) {
    const directKey = [userId, otherUserId].sort().join(":");
    const existing = await prisma.conversation.findUnique({
      where: { directKey },
      include: { members: MEMBER_INCLUDE },
    });
    if (existing) return existing;

    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
    });
    const conversation = await prisma.conversation.create({
      data: {
        type: "DIRECT",
        directKey,
        createdById: userId,
        lastMessageAt: new Date(),
        members: {
          create: [
            { userId, role: "OWNER" },
            { userId: otherUserId, role: "MEMBER" },
          ],
        },
        messages: {
          create: {
            senderId: userId,
            content: `Conversation started with ${otherUser?.displayName || "user"}.`,
            type: "SYSTEM",
            status: "READ",
          },
        },
      },
      include: { members: MEMBER_INCLUDE },
    });
    return conversation;
  },

  async createGroupConversation(userId, { name, description, memberIds = [] }) {
    const uniqueIds = Array.from(new Set([userId, ...memberIds]));
    const conversation = await prisma.conversation.create({
      data: {
        type: "GROUP",
        name: name.trim(),
        description: description?.trim() || "",
        createdById: userId,
        lastMessageAt: new Date(),
        members: {
          create: uniqueIds.map((id, i) => ({
            userId: id,
            role: id === userId ? "OWNER" : i === 1 ? "ADMIN" : "MEMBER",
          })),
        },
        messages: {
          create: {
            senderId: userId,
            content: `${name.trim()} was created.`,
            type: "SYSTEM",
            status: "READ",
          },
        },
      },
      include: { members: MEMBER_INCLUDE },
    });
    return conversation;
  },

  async updateGroupInfo(conversationId, { name, description }) {
    return prisma.conversation.update({
      where: { id: conversationId },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(description !== undefined
          ? { description: description.trim() }
          : {}),
      },
      include: { members: MEMBER_INCLUDE },
    });
  },

  async addGroupMembers(conversationId, memberIds) {
    await prisma.conversationMember.createMany({
      data: memberIds.map((userId) => ({
        conversationId,
        userId,
        role: "MEMBER",
      })),
      skipDuplicates: true,
    });
    return prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: MEMBER_INCLUDE },
    });
  },

  async removeGroupMember(conversationId, memberId) {
    await prisma.conversationMember.updateMany({
      where: { conversationId, userId: memberId },
      data: { leftAt: new Date() },
    });
  },

  async getMessagesForConversation(
    conversationId,
    page = 1,
    limit = 20,
    currentUserId = null,
  ) {
    const offset = (Number(page) - 1) * Number(limit);
    const [total, messages] = await Promise.all([
      prisma.message.count({ where: { conversationId, deletedAt: null } }),
      prisma.message.findMany({
        where: { conversationId, deletedAt: null },
        include: { sender: true, reads: true },
        orderBy: { createdAt: "asc" },
        skip: offset,
        take: Number(limit),
      }),
    ]);

    if (currentUserId) {
      const unreadIds = messages
        .filter(
          (m) =>
            m.senderId !== currentUserId &&
            !m.reads.some((r) => r.userId === currentUserId),
        )
        .map((m) => m.id);
      if (unreadIds.length) {
        await prisma.messageRead.createMany({
          data: unreadIds.map((messageId) => ({
            messageId,
            userId: currentUserId,
          })),
          skipDuplicates: true,
        });
      }
    }

    return {
      items: messages.map(formatMessage),
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.max(1, Math.ceil(total / Number(limit))),
    };
  },

  async createMessage({ conversationId, senderId, content }) {
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
        type: "TEXT",
        status: "SENT",
        reads: { create: { userId: senderId } },
      },
      include: { sender: true, reads: true },
    });
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: message.createdAt },
    });
    return formatMessage(message);
  },

  async updateMessage(messageId, senderId, content) {
    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) {
      const e = new Error("Message not found.");
      e.status = 404;
      throw e;
    }
    if (msg.senderId !== senderId) {
      const e = new Error("You can only edit your own messages.");
      e.status = 403;
      throw e;
    }
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { content, editedAt: new Date(), editedById: senderId },
      include: { sender: true, reads: true },
    });
    return formatMessage(updated);
  },

  async deleteMessage(messageId, senderId) {
    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) {
      const e = new Error("Message not found.");
      e.status = 404;
      throw e;
    }
    if (msg.senderId !== senderId) {
      const e = new Error("You can only delete your own messages.");
      e.status = 403;
      throw e;
    }
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), content: "[deleted]" },
      include: { sender: true, reads: true },
    });
    return formatMessage(updated);
  },
};

const makeId = (prefix) => `${prefix}_${crypto.randomUUID()}`;

const state = {
  users: [],
  conversations: [],
  messages: [],
  // In-memory JWT denylist; revoked JTIs are added on logout.
  revokedTokens: new Set(),
};

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  username: user.username,
  bio: user.bio || "",
  avatar: user.avatar || user.name?.slice(0, 2).toUpperCase() || "U",
  color: user.color || "from-violet-500 to-indigo-500",
  status: user.status || "online",
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const toMessagePayload = (message) => {
  const sender = state.users.find((user) => user.id === message.senderId);

  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    senderName: sender?.name || "Unknown user",
    text: message.content,
    content: message.content,
    type: message.type,
    status: message.status,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    editedAt: message.editedAt || null,
    deletedAt: message.deletedAt || null,
    readBy: message.readBy || [],
  };
};

const toConversationPayload = (conversation, currentUserId) => {
  const members = conversation.members.map((member) => {
    const user = state.users.find((entry) => entry.id === member.userId);
    return {
      ...member,
      id: member.userId,
      userId: member.userId,
      name: user?.name || "Unknown user",
      email: user?.email || "",
      role: member.role,
      status: user?.status || "offline",
      user: user ? sanitizeUser(user) : null,
    };
  });

  const lastMessage = state.messages
    .filter((message) => message.conversationId === conversation.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

  const unreadCount = state.messages.filter(
    (message) =>
      message.conversationId === conversation.id &&
      message.senderId !== currentUserId &&
      !message.readBy.includes(currentUserId),
  ).length;

  return {
    id: conversation.id,
    type: conversation.type,
    name: conversation.title || conversation.name || "Conversation",
    title: conversation.title || conversation.name || "Conversation",
    description: conversation.description || "",
    avatar:
      conversation.avatar ||
      conversation.title?.slice(0, 2).toUpperCase() ||
      "C",
    color: conversation.color || "from-violet-500 to-indigo-500",
    members: conversation.members.map((member) => member.userId),
    status: conversation.status || "online",
    unreadCount,
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          senderId: lastMessage.senderId,
          text: lastMessage.content,
          content: lastMessage.content,
          createdAt: lastMessage.createdAt,
          status: lastMessage.status,
        }
      : null,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    membersMeta: members,
  };
};
