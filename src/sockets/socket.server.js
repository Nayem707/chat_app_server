import { Server } from "socket.io";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { authService } from "../modules/auth/auth.service.js";
import { userRepository } from "../modules/user/user.repository.js";
import { conversationRepository } from "../modules/conversation/conversation.repository.js";

export const createSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("auth_error"));
    try {
      const payload = verifyAccessToken(token);
      if (authService.isTokenRevoked(payload.jti))
        return next(new Error("auth_error"));
      const user = await userRepository.findById(payload.sub);
      if (!user) return next(new Error("auth_error"));
      socket.userId = user._id ? user._id.toString() : user.id;
      next();
    } catch {
      next(new Error("auth_error"));
    }
  });

  io.on("connection", (socket) => {
    const { userId } = socket;
    logger.debug({ socketId: socket.id, userId }, "Socket connected");

    socket.broadcast.emit("user_online", { userId });

    socket.on("join_conversation", async ({ conversationId }) => {
      const conversation =
        await conversationRepository.findById(conversationId);
      const isMember = conversation?.members?.some((member) => {
        const memberUserId = member.user?._id
          ? member.user._id.toString()
          : member.user?.toString?.();
        return memberUserId === userId;
      });
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
