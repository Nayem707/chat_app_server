import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/**
 * Creates the Socket.IO server bound to the shared HTTP server.
 * Authentication middleware + event handlers are wired in Phase 2/4.
 */
export const createSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
    // Prefer WebSocket; fall back to polling for older clients.
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    logger.debug({ socketId: socket.id }, 'Socket connected (unauthenticated placeholder)');
    socket.on('disconnect', (reason) => {
      logger.debug({ socketId: socket.id, reason }, 'Socket disconnected');
    });
  });

  return io;
};
