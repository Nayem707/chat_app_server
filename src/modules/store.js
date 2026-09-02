import argon2 from "argon2";
import crypto from "node:crypto";

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

export const appStore = {
  state,
  sanitizeUser,
  makeId,
  revokeToken(jti) {
    state.revokedTokens.add(jti);
  },
  isTokenRevoked(jti) {
    return state.revokedTokens.has(jti);
  },
  findUserByEmail(email) {
    return state.users.find(
      (user) => user.email.toLowerCase() === String(email).toLowerCase(),
    );
  },
  async registerUser({ name, email, password }) {
    if (!name?.trim() || !email?.trim() || !password) {
      const error = new Error("Name, email, and password are required.");
      error.status = 400;
      throw error;
    }

    if (this.findUserByEmail(email)) {
      const error = new Error("User with this email already exists.");
      error.status = 409;
      throw error;
    }

    const hashed = await argon2.hash(password);
    const user = {
      id: makeId("user"),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      username: `${name.trim().toLowerCase().replace(/\s+/g, ".")}.${Math.random().toString(36).slice(2, 6)}`,
      passwordHash: hashed,
      bio: "",
      avatar: name.trim().slice(0, 2).toUpperCase(),
      color: "from-violet-500 to-indigo-500",
      status: "online",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    state.users.push(user);
    return user;
  },
  async loginUser({ email, password }) {
    const user = this.findUserByEmail(email);
    if (!user) {
      const error = new Error("Invalid email or password.");
      error.status = 401;
      throw error;
    }

    const passwordMatches = await argon2.verify(user.passwordHash, password);
    if (!passwordMatches) {
      const error = new Error("Invalid email or password.");
      error.status = 401;
      throw error;
    }

    return user;
  },
  updateUser(userId, updates) {
    const user = state.users.find((entry) => entry.id === userId);
    if (!user) return null;
    Object.assign(user, updates, { updatedAt: new Date().toISOString() });
    return user;
  },
  getUsersForSearch(currentUserId, query = "") {
    const needle = query.trim().toLowerCase();
    return state.users
      .filter((user) => user.id !== currentUserId)
      .filter((user) => {
        if (!needle) return true;
        return `${user.name} ${user.email}`.toLowerCase().includes(needle);
      })
      .slice(0, 20)
      .map((user) => sanitizeUser(user));
  },
  getConversationById(conversationId) {
    return (
      state.conversations.find(
        (conversation) => conversation.id === conversationId,
      ) || null
    );
  },
  getConversationsForUser(userId) {
    return state.conversations
      .filter((conversation) =>
        conversation.members.some((member) => member.userId === userId),
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt) -
          new Date(a.updatedAt || a.createdAt),
      )
      .map((conversation) => toConversationPayload(conversation, userId));
  },
  createDirectConversation(userId, otherUserId) {
    const directKey = [userId, otherUserId].sort().join(":");
    const existing = state.conversations.find(
      (conversation) =>
        conversation.type === "DIRECT" && conversation.directKey === directKey,
    );

    if (existing) {
      return existing;
    }

    const otherUser = state.users.find((user) => user.id === otherUserId);
    const currentUser = state.users.find((user) => user.id === userId);
    const conversation = {
      id: makeId("conversation"),
      type: "DIRECT",
      title: otherUser?.name || "Direct chat",
      description: "Direct conversation",
      avatar: otherUser?.avatar || "DM",
      color: otherUser?.color || "from-violet-500 to-indigo-500",
      members: [
        { userId, role: "OWNER", joinedAt: new Date().toISOString() },
        {
          userId: otherUserId,
          role: "MEMBER",
          joinedAt: new Date().toISOString(),
        },
      ],
      status: "online",
      directKey,
      createdById: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    state.conversations.push(conversation);
    if (currentUser && otherUser) {
      state.messages.push({
        id: makeId("message"),
        conversationId: conversation.id,
        senderId: userId,
        content: `Conversation started with ${otherUser.name}.`,
        type: "TEXT",
        status: "READ",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        readBy: [userId, otherUserId],
      });
      conversation.updatedAt = new Date().toISOString();
    }

    return conversation;
  },
  createGroupConversation(userId, { name, description, memberIds = [] }) {
    const uniqueMembers = Array.from(new Set([userId, ...memberIds]));
    const conversation = {
      id: makeId("group"),
      type: "GROUP",
      name: name.trim(),
      title: name.trim(),
      description: description?.trim() || "",
      avatar: name.trim().slice(0, 2).toUpperCase(),
      color: "from-violet-500 to-indigo-500",
      members: uniqueMembers.map((memberId, index) => ({
        userId: memberId,
        role: memberId === userId ? "OWNER" : index === 0 ? "ADMIN" : "MEMBER",
        joinedAt: new Date().toISOString(),
      })),
      status: "online",
      createdById: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    state.conversations.push(conversation);
    state.messages.push({
      id: makeId("message"),
      conversationId: conversation.id,
      senderId: userId,
      content: `${name.trim()} was created by ${state.users.find((user) => user.id === userId)?.name || "the team"}.`,
      type: "TEXT",
      status: "READ",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      readBy: uniqueMembers,
    });
    return conversation;
  },
  getMessagesForConversation(
    conversationId,
    page = 1,
    limit = 20,
    currentUserId = null,
  ) {
    const filteredMessages = state.messages
      .filter((message) => message.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const offset = (Number(page) - 1) * Number(limit);
    const items = filteredMessages
      .slice(offset, offset + Number(limit))
      .map((message) => toMessagePayload(message));

    if (currentUserId) {
      filteredMessages.forEach((message) => {
        if (
          message.senderId !== currentUserId &&
          !message.readBy.includes(currentUserId)
        ) {
          message.readBy = [...new Set([...message.readBy, currentUserId])];
        }
      });
    }

    return {
      items,
      total: filteredMessages.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.max(
        1,
        Math.ceil(filteredMessages.length / Number(limit)),
      ),
    };
  },
  createMessage({ conversationId, senderId, content }) {
    const conversation = this.getConversationById(conversationId);
    if (!conversation) {
      const error = new Error("Conversation not found.");
      error.status = 404;
      throw error;
    }

    const message = {
      id: makeId("message"),
      conversationId,
      senderId,
      content,
      type: "TEXT",
      status: "SENT",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      readBy: [senderId],
    };

    state.messages.push(message);
    conversation.updatedAt = new Date().toISOString();
    conversation.lastMessageAt = message.createdAt;
    return toMessagePayload(message);
  },
  updateMessage(messageId, senderId, content) {
    const message = state.messages.find((entry) => entry.id === messageId);
    if (!message) {
      const error = new Error("Message not found.");
      error.status = 404;
      throw error;
    }
    if (message.senderId !== senderId) {
      const error = new Error("You can only edit your own messages.");
      error.status = 403;
      throw error;
    }
    message.content = content;
    message.editedAt = new Date().toISOString();
    message.updatedAt = new Date().toISOString();
    return toMessagePayload(message);
  },
  deleteMessage(messageId, senderId) {
    const message = state.messages.find((entry) => entry.id === messageId);
    if (!message) {
      const error = new Error("Message not found.");
      error.status = 404;
      throw error;
    }
    if (message.senderId !== senderId) {
      const error = new Error("You can only delete your own messages.");
      error.status = 403;
      throw error;
    }
    message.deletedAt = new Date().toISOString();
    message.content = "[deleted]";
    return toMessagePayload(message);
  },
};

export const seedDemoData = async () => {
  if (state.users.length > 0) return;

  const [userOneHash, userTwoHash, userThreeHash] = await Promise.all([
    argon2.hash("password123"),
    argon2.hash("password123"),
    argon2.hash("password123"),
  ]);

  const userOne = {
    id: "user_1",
    name: "Alicia Grant",
    email: "alicia@luma.chat",
    username: "alicia.grant",
    passwordHash: userOneHash,
    bio: "Building tools that help teams move faster.",
    avatar: "AG",
    color: "from-violet-500 to-indigo-500",
    status: "online",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const userTwo = {
    id: "user_2",
    name: "Noah Patel",
    email: "noah@luma.chat",
    username: "noah.patel",
    passwordHash: userTwoHash,
    bio: "Shipping helpful UX improvements.",
    avatar: "NP",
    color: "from-emerald-500 to-teal-500",
    status: "online",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const userThree = {
    id: "user_3",
    name: "Maya Chen",
    email: "maya@luma.chat",
    username: "maya.chen",
    passwordHash: userThreeHash,
    bio: "Designing for delight.",
    avatar: "MC",
    color: "from-amber-500 to-orange-500",
    status: "away",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  state.users.push(userOne, userTwo, userThree);

  const directConversation = {
    id: "conversation_1",
    type: "DIRECT",
    title: "Noah Patel",
    description: "Direct message",
    avatar: "NP",
    color: "from-emerald-500 to-teal-500",
    members: [
      { userId: "user_1", role: "OWNER", joinedAt: new Date().toISOString() },
      { userId: "user_2", role: "MEMBER", joinedAt: new Date().toISOString() },
    ],
    status: "online",
    directKey: ["user_1", "user_2"].sort().join(":"),
    createdById: "user_1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const groupConversation = {
    id: "conversation_2",
    type: "GROUP",
    title: "Product Launch",
    description: "Cross-functional launch team",
    avatar: "PL",
    color: "from-indigo-500 to-violet-500",
    members: [
      { userId: "user_1", role: "OWNER", joinedAt: new Date().toISOString() },
      { userId: "user_2", role: "ADMIN", joinedAt: new Date().toISOString() },
      { userId: "user_3", role: "MEMBER", joinedAt: new Date().toISOString() },
    ],
    status: "online",
    createdById: "user_1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  state.conversations.push(directConversation, groupConversation);
  state.messages.push(
    {
      id: "message_1",
      conversationId: "conversation_1",
      senderId: "user_2",
      content: "The launch checklist is ready for review.",
      type: "TEXT",
      status: "READ",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      readBy: ["user_1", "user_2"],
    },
    {
      id: "message_2",
      conversationId: "conversation_2",
      senderId: "user_3",
      content:
        "I tightened the animation timing and it feels much more natural.",
      type: "TEXT",
      status: "READ",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      readBy: ["user_1", "user_2", "user_3"],
    },
  );
};

await seedDemoData();
