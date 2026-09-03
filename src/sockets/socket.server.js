import { Server } from "socket.io";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { appStore } from "../modules/store.js";

export const createSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Verify JWT before allowing connection
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("auth_error"));
    try {
      const payload = verifyAccessToken(token);
      if (appStore.isTokenRevoked(payload.jti))
        return next(new Error("auth_error"));
      const user = appStore.state.users.find((u) => u.id === payload.sub);
      if (!user) return next(new Error("auth_error"));
      socket.userId = user.id;
      next();
    } catch {
      next(new Error("auth_error"));
    }
  });

  io.on("connection", (socket) => {
    const { userId } = socket;
    logger.debug({ socketId: socket.id, userId }, "Socket connected");

    // Broadcast presence to everyone
    socket.broadcast.emit("user_online", { userId });

    socket.on("join_conversation", ({ conversationId }) => {
      const conversation = appStore.getConversationById(conversationId);
      const isMember = conversation?.members?.some((m) => m.userId === userId);
      if (isMember) socket.join(`conversation:${conversationId}`);
    });

    socket.on("leave_conversation", ({ conversationId }) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on("typing_start", ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit("typing", {
        conversationId,
        userId,
        state: "start",
      });
    });

    socket.on("typing_stop", ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit("typing", {
        conversationId,
        userId,
        state: "stop",
      });
    });

    socket.on("disconnect", (reason) => {
      logger.debug(
        { socketId: socket.id, userId, reason },
        "Socket disconnected",
      );
      socket.broadcast.emit("user_offline", {
        userId,
        lastSeenAt: new Date().toISOString(),
      });
    });
  });

  return io;
};
