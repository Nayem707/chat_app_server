import { userRepository } from "./user.repository.js";

export const sanitizeUser = (user) => {
  if (!user) return null;

  const normalizedId = user.id ?? user._id?.toString?.() ?? user.toString?.();
  return {
    id: normalizedId,
    name: user.displayName ?? user.name ?? "Unknown user",
    email: user.email,
    username: user.username,
    bio: user.bio || "",
    avatar: user.avatarUrl || user.avatar || "",
    coverUrl: user.coverUrl || "",
    color: user.color || "from-violet-500 to-indigo-500",
    status: user.status || (user.isOnline ? "online" : "offline"),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

export const userService = {
  async search(currentUserId, query = "") {
    const users = await userRepository.searchUsers(currentUserId, query);
    return users.map(sanitizeUser);
  },

  async getCurrentProfile(user) {
    return sanitizeUser(user);
  },

  async updateCurrentProfile(userId, updates = {}) {
    const next = {};
    if (typeof updates.name === "string" && updates.name.trim()) {
      next.displayName = updates.name.trim();
    }
    if (typeof updates.bio === "string") {
      next.bio = updates.bio.trim();
    }
    if (typeof updates.avatarUrl === "string") {
      next.avatarUrl = updates.avatarUrl;
    }
    if (typeof updates.coverUrl === "string") {
      next.coverUrl = updates.coverUrl;
    }
    const user = await userRepository.updateById(userId, next);
    return sanitizeUser(user);
  },
};
